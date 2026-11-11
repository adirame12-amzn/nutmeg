from __future__ import annotations

import argparse
import csv
import html
import json
import math
import os
import sqlite3
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

from .pipeline import (
    CACHE,
    COMMONS_API,
    DEFAULT_SOURCE,
    PUBLIC_PLAYERS,
    WIKIDATA_API,
    CachedApi,
    age_on,
    claim_value,
    clean_html,
    commons_metadata,
    licence_status,
    mapped_position,
    parse_source_date,
    render_editorial,
    render_portrait,
    resolve_entity,
    slugify,
)

ROOT = Path(__file__).resolve().parents[1]
WIKIDATA_OVERRIDES = {
    # Source uses the abbreviated "Gabriel dos S. Magalhães", which Wikidata search does not resolve reliably.
    "232580": "Q25175970",
}


def player_name(row: dict[str, str]) -> str:
    common = row.get("common_name", "").strip()
    return common or " ".join(part for part in (row.get("first_name", "").strip(), row.get("last_name", "").strip()) if part)


def selection_for(row: dict[str, str]) -> dict[str, str]:
    name = player_name(row)
    full_name = " ".join(part for part in (row.get("first_name", "").strip(), row.get("last_name", "").strip()) if part)
    aliases = "|".join(dict.fromkeys(value for value in (full_name, row.get("last_name", "").strip()) if value and value != name))
    return {
        "source_player_id": row["player_id"],
        "display_name": name,
        "aliases": aliases,
        "wikidata_id": WIKIDATA_OVERRIDES.get(row["player_id"], ""),
        "portrait_review_status": "approved",
    }


def source_cohort(source: Path, rating: int) -> list[dict[str, str]]:
    with source.open(encoding="utf-8-sig", newline="") as handle:
        rows = [
            row for row in csv.DictReader(handle)
            if row.get("gender") == "Men's Football" and row.get("overall_rating") == str(rating)
        ]
    return sorted(rows, key=lambda row: (player_name(row).casefold(), row["player_id"]))


def build_catalog(source: Path, rating: int, *, offline: bool = False, dry_run: bool = False) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, str]]]:
    rows = source_cohort(source, rating)
    if not rows:
        raise ValueError(f"No men's players found at rating {rating}")
    api = CachedApi(offline=offline)
    players: list[dict[str, Any]] = []
    attributions: list[dict[str, Any]] = []
    issues: list[dict[str, str]] = []
    asset_dir = PUBLIC_PLAYERS / f"rating-{rating}"
    fallback = "/nutmeg/players/fallback-player.svg"
    slug_counts = Counter(slugify(player_name(row)) for row in rows)

    for row in rows:
        selection = selection_for(row)
        display_name = selection["display_name"]
        base_slug = slugify(display_name)
        slug = f"{base_slug}-{row['player_id']}" if slug_counts[base_slug] > 1 else base_slug
        try:
            qid, identity_status = resolve_entity(api, selection, row)
        except Exception as error:
            qid, identity_status = None, "resolution_error"
            issues.append({"player": display_name, "issue": f"identity resolution failed: {error}"})

        image_file = None
        if qid:
            entity = api.get(WIKIDATA_API, {
                "action": "wbgetentities", "format": "json", "ids": qid,
                "props": "claims|labels", "languages": "en",
            }).get("entities", {}).get(qid, {})
            image_file = claim_value(entity, "P18")

        portrait_url = fallback
        editorial_url = fallback
        image_status = "fallback"
        if image_file:
            info = commons_metadata(api, image_file)
            if info:
                metadata = info.get("extmetadata", {})
                license_name = metadata.get("LicenseShortName", {}).get("value", "Unknown")
                status = licence_status(license_name, "approved")
                attribution = {
                    "playerId": slug, "wikidataId": qid, "file": image_file,
                    "sourcePage": f"https://commons.wikimedia.org/wiki/File:{image_file.replace(' ', '_')}",
                    "creator": clean_html(metadata.get("Artist", {}).get("value", "Unknown")),
                    "license": license_name,
                    "licenseUrl": metadata.get("LicenseUrl", {}).get("value", ""),
                    "status": status,
                }
                attributions.append(attribution)
                if status == "approved" and not dry_run:
                    clean_path = asset_dir / f"{slug}.webp"
                    editorial_path = asset_dir / f"{slug}-editorial.webp"
                    try:
                        if not clean_path.exists():
                            render_portrait(info.get("thumburl") or info["url"], clean_path)
                        if not editorial_path.exists():
                            render_editorial(clean_path, editorial_path)
                        portrait_url = f"/nutmeg/players/rating-{rating}/{slug}.webp"
                        editorial_url = f"/nutmeg/players/rating-{rating}/{slug}-editorial.webp"
                        image_status = "reviewed_metadata"
                    except Exception as error:
                        issues.append({"player": display_name, "issue": f"portrait processing failed: {error}"})
                else:
                    issues.append({"player": display_name, "issue": f"portrait {status}: {license_name}"})
        else:
            issues.append({"player": display_name, "issue": "no verified Wikimedia portrait"})

        birthdate = parse_source_date(row["birthdate"])
        snapshot = parse_source_date(row["snapshot_date"])
        players.append({
            "id": slug,
            "sourcePlayerId": row["player_id"],
            "displayName": display_name,
            "aliases": [alias for alias in selection["aliases"].split("|") if alias],
            "currentClub": row["club"], "league": row["league"], "nationalTeam": row["nationality"],
            "position": mapped_position(row["position"]), "rawPosition": row["position"],
            "age": age_on(birthdate, snapshot), "birthdate": birthdate.isoformat(),
            "dominantFoot": row["preferred_foot"] if row["preferred_foot"] in {"Left", "Right"} else "Unknown",
            "fcOverall": int(row["overall_rating"]),
            "portraitUrl": portrait_url, "portraitEditorialUrl": editorial_url,
            "portraitStatus": image_status, "wikidataId": qid, "identityStatus": identity_status,
            "sourceSnapshot": snapshot.isoformat(), "poolCategory": "men",
            "dataStatus": "prototype_source_licence_review_pending",
        })
    return players, attributions, issues


def write_database(output: Path, players: list[dict[str, Any]], attributions: list[dict[str, Any]]) -> None:
    if output.exists():
        output.unlink()
    connection = sqlite3.connect(output)
    try:
        connection.executescript("""
            CREATE TABLE players (
                id TEXT PRIMARY KEY, source_player_id TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
                aliases_json TEXT NOT NULL, fc_overall INTEGER NOT NULL, raw_position TEXT NOT NULL,
                position TEXT NOT NULL, club TEXT NOT NULL, league TEXT NOT NULL, nationality TEXT NOT NULL,
                dominant_foot TEXT NOT NULL, birthdate TEXT NOT NULL, age INTEGER NOT NULL,
                source_snapshot TEXT NOT NULL, wikidata_id TEXT, identity_status TEXT NOT NULL,
                portrait_url TEXT NOT NULL, editorial_url TEXT NOT NULL, portrait_status TEXT NOT NULL,
                cutout_url TEXT, cutout_editorial_url TEXT, cutout_status TEXT,
                pool_category TEXT NOT NULL, data_status TEXT NOT NULL
            );
            CREATE TABLE attributions (
                player_id TEXT PRIMARY KEY REFERENCES players(id), wikidata_id TEXT, file_name TEXT NOT NULL,
                source_page TEXT NOT NULL, creator TEXT NOT NULL, license TEXT NOT NULL,
                license_url TEXT NOT NULL, review_status TEXT NOT NULL
            );
            CREATE INDEX players_rating_idx ON players(fc_overall);
            CREATE INDEX players_name_idx ON players(display_name);
        """)
        connection.executemany(
            "INSERT INTO players VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [(
                player["id"], player["sourcePlayerId"], player["displayName"], json.dumps(player["aliases"], ensure_ascii=False),
                player["fcOverall"], player["rawPosition"], player["position"], player["currentClub"], player["league"],
                player["nationalTeam"], player["dominantFoot"], player["birthdate"], player["age"], player["sourceSnapshot"],
                player["wikidataId"], player["identityStatus"], player["portraitUrl"], player["portraitEditorialUrl"],
                player["portraitStatus"], player.get("portraitCutoutUrl"), player.get("portraitCutoutEditorialUrl"),
                player.get("portraitCutoutStatus"), player["poolCategory"], player["dataStatus"],
            ) for player in players],
        )
        connection.executemany(
            "INSERT INTO attributions VALUES (?,?,?,?,?,?,?,?)",
            [(
                item["playerId"], item["wikidataId"], item["file"], item["sourcePage"], item["creator"],
                item["license"], item["licenseUrl"], item["status"],
            ) for item in attributions if any(player["id"] == item["playerId"] for player in players)],
        )
        connection.commit()
    finally:
        connection.close()


def write_review_assets(output: Path, rating: int, players: list[dict[str, Any]]) -> None:
    columns, cell_width, cell_height = 5, 200, 280
    rows = math.ceil(len(players) / columns)
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#eee3cf")
    draw = ImageDraw.Draw(sheet)
    cards: list[str] = []
    for index, player in enumerate(players):
        clean_path = ROOT / "public" / player["portraitUrl"].replace("/nutmeg/", "")
        if player["portraitStatus"] != "fallback" and clean_path.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png"} and clean_path.exists():
            with Image.open(clean_path) as source:
                portrait = source.convert("RGB")
                portrait.thumbnail((180, 220))
                x = (index % columns) * cell_width + (cell_width - portrait.width) // 2
                y = (index // columns) * cell_height + 4
                sheet.paste(portrait, (x, y))
        text_x, text_y = (index % columns) * cell_width + 8, (index // columns) * cell_height + 228
        draw.text((text_x, text_y), player["displayName"], fill="#1d1d1b")
        draw.text((text_x, text_y + 18), f"{player['rawPosition']} · {player['currentClub']}", fill="#5a554d")
        clean_src = f"../../../public/players/rating-{rating}/{player['id']}.webp"
        editorial_src = f"../../../public/players/rating-{rating}/{player['id']}-editorial.webp"
        cards.append(
            f'<article><div><img src="{clean_src}" alt="Clean crop of {html.escape(player["displayName"])}">'
            f'<img src="{editorial_src}" alt="Editorial crop of {html.escape(player["displayName"])}"></div>'
            f'<h2>{html.escape(player["displayName"])}</h2><p>{html.escape(player["currentClub"])} · '
            f'{html.escape(player["position"])} · FC {player["fcOverall"]}</p></article>'
        )
    sheet.save(output / "contact-sheet.jpg", quality=88)
    gallery = f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Nutmeg FC {rating} portrait review</title><style>body{{margin:0;padding:24px;background:#eee3cf;color:#1d1d1b;font-family:system-ui}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}}article{{padding:10px;border:1px solid;border-radius:12px;background:#faf3e7}}article div{{display:grid;grid-template-columns:1fr 1fr;gap:5px}}img{{width:100%;aspect-ratio:4/5;object-fit:cover}}h2{{margin:8px 0 2px;font-family:Georgia}}p{{margin:0;font-size:12px}}</style><h1>Men's FC {rating} portrait review</h1><p>Clean source crop and newspaper derivative.</p><main>{''.join(cards)}</main></html>"""
    (output / "review.html").write_text(gallery)


def write_outputs(rating: int, players: list[dict[str, Any]], attributions: list[dict[str, Any]], issues: list[dict[str, str]], dry_run: bool) -> None:
    report = {
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "rating": rating, "players": len(players),
        "verifiedIdentities": sum(1 for player in players if player["wikidataId"]),
        "publishedPortraits": sum(1 for player in players if player["portraitStatus"] != "fallback"),
        "fallbackPortraits": sum(1 for player in players if player["portraitStatus"] == "fallback"),
        "issues": issues, "sourceLicenseStatus": "review_required",
    }
    if dry_run:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return
    output = ROOT / "data/generated" / f"rating-{rating}"
    output.mkdir(parents=True, exist_ok=True)
    for name, payload in (("players.json", players), ("attributions.json", attributions), ("report.json", report)):
        (output / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    write_database(output / "players.sqlite", players, attributions)
    write_review_assets(output, rating, players)
    lines = [
        f"# Men's FC {rating} catalogue", "", f"Generated: {report['generatedAt']}", "",
        f"- Players: {report['players']}", f"- Verified identities: {report['verifiedIdentities']}",
        f"- Published clean + editorial portraits: {report['publishedPortraits']}",
        f"- Fallback portraits: {report['fallbackPortraits']}",
        "- Source redistribution licence: **review required**", "", "## Review queue",
    ]
    lines.extend(f"- **{issue['player']}** — {issue['issue']}" for issue in issues)
    (output / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a men's catalogue for one FC overall rating")
    parser.add_argument("--source", type=Path, default=Path(os.environ.get("FC27_CSV", DEFAULT_SOURCE)))
    parser.add_argument("--rating", type=int, default=85)
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        players, attributions, issues = build_catalog(args.source, args.rating, offline=args.offline, dry_run=args.dry_run)
        write_outputs(args.rating, players, attributions, issues, args.dry_run)
    except Exception as error:
        print(f"rating catalogue failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
