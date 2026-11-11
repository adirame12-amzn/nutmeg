from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import os
import re
import sys
import time
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from PIL import Image, ImageDraw, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data/raw/players.csv"
SELECTED = ROOT / "data/selected_players.csv"
GENERATED = ROOT / "data/generated"
CACHE = ROOT / "data/cache"
PUBLIC_PLAYERS = ROOT / "public/players"
USER_AGENT = "NutmegDataPipeline/0.1 (https://github.com/adirame12-amzn/nutmeg)"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"


def normalise_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def parse_source_date(value: str) -> date:
    for pattern in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, pattern).date()
        except ValueError:
            pass
    raise ValueError(f"Unsupported date: {value}")


def age_on(birthdate: date, snapshot: date) -> int:
    return snapshot.year - birthdate.year - ((snapshot.month, snapshot.day) < (birthdate.month, birthdate.day))


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", normalise_text(value)).strip("-")


def mapped_position(value: str) -> str:
    if value == "GK":
        return "Goalkeeper"
    if value in {"CB", "LB", "RB", "LWB", "RWB"}:
        return "Defender"
    if value in {"CDM", "CM", "CAM", "LM", "RM"}:
        return "Midfielder"
    return "Forward"


def validate_men_only(source_rows: dict[str, dict[str, str]], wanted: dict[str, dict[str, str]]) -> None:
    non_men = [wanted[player_id]["display_name"] for player_id, row in source_rows.items() if row.get("gender") != "Men's Football"]
    if non_men:
        raise ValueError(f"Temporary men-only demo pool rejected: {', '.join(non_men)}")


class CachedApi:
    def __init__(self, offline: bool = False) -> None:
        self.offline = offline
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"})
        CACHE.mkdir(parents=True, exist_ok=True)

    def get(self, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
        cache_key = hashlib.sha256((endpoint + json.dumps(params, sort_keys=True)).encode()).hexdigest()
        cache_path = CACHE / f"{cache_key}.json"
        if cache_path.exists():
            return json.loads(cache_path.read_text())
        if self.offline:
            raise RuntimeError(f"Offline cache miss for {params}")
        for attempt in range(4):
            response = self.session.get(endpoint, params={**params, "maxlag": 5}, timeout=30)
            if response.status_code == 429:
                time.sleep(int(response.headers.get("Retry-After", "2")))
                continue
            response.raise_for_status()
            payload = response.json()
            cache_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
            time.sleep(0.12)
            return payload
        raise RuntimeError("API rate limit did not clear")


def claim_value(entity: dict[str, Any], prop: str) -> Any:
    claims = entity.get("claims", {}).get(prop, [])
    if not claims:
        return None
    return claims[0].get("mainsnak", {}).get("datavalue", {}).get("value")


def claim_values(entity: dict[str, Any], prop: str) -> list[Any]:
    return [
        claim.get("mainsnak", {}).get("datavalue", {}).get("value")
        for claim in entity.get("claims", {}).get(prop, [])
        if claim.get("mainsnak", {}).get("datavalue", {}).get("value") is not None
    ]


def qid_from_claim(entity: dict[str, Any], prop: str) -> str | None:
    value = claim_value(entity, prop)
    return value.get("id") if isinstance(value, dict) else None


def resolve_entity(api: CachedApi, selection: dict[str, str], row: dict[str, str]) -> tuple[str | None, str]:
    override = selection.get("wikidata_id", "").strip()
    if override:
        entity = api.get(WIKIDATA_API, {
            "action": "wbgetentities", "format": "json", "ids": override,
            "props": "claims|labels", "languages": "en",
        }).get("entities", {}).get(override, {})
        dob = claim_value(entity, "P569")
        expected_dob = parse_source_date(row["birthdate"]).isoformat()
        if not isinstance(dob, dict) or dob.get("time", "")[1:11] != expected_dob:
            raise ValueError(f"Manual Wikidata override failed DOB check: {selection['display_name']} ({override})")
        return override, "manual_override_dob_verified"
    expected_dob = parse_source_date(row["birthdate"]).isoformat()
    expected_nation = normalise_text(row["nationality"])
    aliases = [alias for alias in selection.get("aliases", "").split("|") if alias]
    queries = list(dict.fromkeys([selection["display_name"], *aliases[:1]]))
    for query in queries:
        search = api.get(WIKIDATA_API, {
            "action": "wbsearchentities", "format": "json", "language": "en",
            "type": "item", "limit": 8, "search": query,
        }).get("search", [])
        for candidate in search:
            qid = candidate["id"]
            entity = api.get(WIKIDATA_API, {
                "action": "wbgetentities", "format": "json", "ids": qid,
                "props": "claims|labels", "languages": "en",
            }).get("entities", {}).get(qid, {})
            dob_match = any(isinstance(value, dict) and value.get("time", "")[1:11] == expected_dob for value in claim_values(entity, "P569"))
            nation_qid = qid_from_claim(entity, "P27")
            nation_match = False
            if nation_qid:
                nation = api.get(WIKIDATA_API, {
                    "action": "wbgetentities", "format": "json", "ids": nation_qid,
                    "props": "labels", "languages": "en",
                }).get("entities", {}).get(nation_qid, {}).get("labels", {}).get("en", {}).get("value", "")
                nation_match = expected_nation in normalise_text(nation) or normalise_text(nation) in expected_nation
            if dob_match and nation_match:
                return qid, "dob_and_nationality"
            description = normalise_text(candidate.get("description", ""))
            if dob_match and "football" in description:
                return qid, "dob_and_football_description"
    return None, "unresolved"


def commons_metadata(api: CachedApi, filename: str) -> dict[str, Any] | None:
    payload = api.get(COMMONS_API, {
        "action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|extmetadata",
        "iiurlwidth": 1200, "titles": f"File:{filename}",
    })
    pages = payload.get("query", {}).get("pages", {})
    info = next(iter(pages.values()), {}).get("imageinfo", [])
    return info[0] if info else None


def clean_html(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).strip()


def licence_status(short_name: str, review_status: str) -> str:
    normal = normalise_text(short_name)
    if "public domain" in normal or normal == "cc0":
        return "approved"
    if "cc by" in normal and "sa" not in normal:
        return "approved"
    if "cc by-sa" in normal and review_status == "approved":
        return "approved"
    if "cc by-sa" in normal:
        return "review_required"
    return "rejected"


def render_portrait(url: str, destination: Path) -> None:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=45)
    response.raise_for_status()
    with Image.open(BytesIO(response.content)) as source:
        converted = ImageOps.exif_transpose(source).convert("RGB")
        portrait = ImageOps.fit(converted, (400, 500), method=Image.Resampling.LANCZOS, centering=(0.5, 0.38))
        destination.parent.mkdir(parents=True, exist_ok=True)
        portrait.save(destination, "WEBP", quality=84, method=6)


def render_editorial(source: Path, destination: Path) -> None:
    """Create a deterministic matchday-print derivative without generative edits."""
    with Image.open(source) as clean:
        grayscale = ImageOps.autocontrast(clean.convert("L"), cutoff=1)
        grayscale = ImageEnhance.Contrast(grayscale).enhance(1.16)
        duotone = ImageOps.colorize(grayscale, black="#201f1b", white="#eee3cf")
        dots = Image.new("RGBA", duotone.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(dots)
        pixels = grayscale.load()
        spacing = 5
        for y in range(2, duotone.height, spacing):
            for x in range(2, duotone.width, spacing):
                darkness = 255 - pixels[x, y]
                if darkness > 72:
                    radius = 0.35 + (darkness / 255) * 0.7
                    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(29, 29, 27, 42))
        treated = Image.alpha_composite(duotone.convert("RGBA"), dots).convert("RGB")
        destination.parent.mkdir(parents=True, exist_ok=True)
        treated.save(destination, "WEBP", quality=84, method=6)


def render_editorial_cutout(source: Path, destination: Path) -> None:
    """Apply the matchday-print treatment while preserving transparent alpha."""
    with Image.open(source) as extracted:
        extracted = ImageOps.exif_transpose(extracted).convert("RGBA")
        extracted.thumbnail((400, 500), Image.Resampling.LANCZOS)
        clean = Image.new("RGBA", (400, 500), (0, 0, 0, 0))
        clean.alpha_composite(extracted, ((400 - extracted.width) // 2, 500 - extracted.height))
        alpha = clean.getchannel("A")
        grayscale = ImageOps.autocontrast(clean.convert("L"), cutoff=1)
        grayscale = ImageEnhance.Contrast(grayscale).enhance(1.18)
        treated = ImageOps.colorize(grayscale, black="#201f1b", white="#eee3cf").convert("RGBA")
        treated.putalpha(alpha)
        dots = Image.new("RGBA", treated.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(dots)
        values, opacity = grayscale.load(), alpha.load()
        for y in range(2, 500, 5):
            for x in range(2, 400, 5):
                darkness = 255 - values[x, y]
                if opacity[x, y] > 40 and darkness > 72:
                    radius = 0.35 + (darkness / 255) * 0.7
                    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(29, 29, 27, min(52, opacity[x, y])))
        treated = Image.alpha_composite(treated, dots)
        destination.parent.mkdir(parents=True, exist_ok=True)
        treated.save(destination, "WEBP", quality=86, method=6)


@dataclass
class IngestResult:
    players: list[dict[str, Any]]
    mappings: list[dict[str, Any]]
    attributions: list[dict[str, Any]]
    issues: list[dict[str, str]]


def run(source: Path, *, offline: bool = False, dry_run: bool = False) -> IngestResult:
    if not source.exists():
        raise FileNotFoundError(f"FC 27 CSV not found: {source}. Pass --source or set FC27_CSV.")
    with SELECTED.open(encoding="utf-8-sig", newline="") as handle:
        selected = [row for row in csv.DictReader(handle) if row["include"].casefold() == "true"]
    wanted = {row["source_player_id"]: row for row in selected}
    source_rows: dict[str, dict[str, str]] = {}
    with source.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("player_id") in wanted:
                source_rows[row["player_id"]] = row
    missing = sorted(set(wanted) - set(source_rows))
    if missing:
        raise ValueError(f"Selected IDs missing from source: {', '.join(missing)}")
    validate_men_only(source_rows, wanted)

    api = CachedApi(offline=offline)
    players: list[dict[str, Any]] = []
    mappings: list[dict[str, Any]] = []
    attributions: list[dict[str, Any]] = []
    issues: list[dict[str, str]] = []
    fallback = "/nutmeg/players/fallback-player.svg"

    for selection in selected:
        row = source_rows[selection["source_player_id"]]
        qid, resolution = resolve_entity(api, selection, row)
        slug = slugify(selection["display_name"])
        portrait_url = fallback
        portrait_status = "fallback"
        image_file = None
        if qid:
            entity = api.get(WIKIDATA_API, {
                "action": "wbgetentities", "format": "json", "ids": qid,
                "props": "claims|labels", "languages": "en",
            }).get("entities", {}).get(qid, {})
            image_file = claim_value(entity, "P18")
        if image_file:
            info = commons_metadata(api, image_file)
            if info:
                meta = info.get("extmetadata", {})
                short_name = meta.get("LicenseShortName", {}).get("value", "Unknown")
                status = licence_status(short_name, selection.get("portrait_review_status", "pending"))
                attribution = {
                    "playerId": slug, "wikidataId": qid, "file": image_file,
                    "sourcePage": f"https://commons.wikimedia.org/wiki/File:{quote(image_file.replace(' ', '_'))}",
                    "creator": clean_html(meta.get("Artist", {}).get("value", "Unknown")),
                    "license": short_name,
                    "licenseUrl": meta.get("LicenseUrl", {}).get("value", ""),
                    "status": status,
                }
                attributions.append(attribution)
                if status == "approved" and not dry_run:
                    output = PUBLIC_PLAYERS / f"{slug}.webp"
                    try:
                        editorial_output = PUBLIC_PLAYERS / f"{slug}-editorial.webp"
                        if not output.exists():
                            render_portrait(info.get("thumburl") or info["url"], output)
                        if not editorial_output.exists():
                            render_editorial(output, editorial_output)
                        portrait_url = f"/nutmeg/players/{slug}.webp"
                        portrait_status = "approved"
                    except Exception as error:  # network/image errors should not break the game build
                        issues.append({"player": selection["display_name"], "issue": f"portrait processing failed: {error}"})
                elif status != "approved":
                    issues.append({"player": selection["display_name"], "issue": f"portrait {status}: {short_name}"})
        else:
            issues.append({"player": selection["display_name"], "issue": "no verified Wikimedia portrait"})

        birthdate = parse_source_date(row["birthdate"])
        snapshot = parse_source_date(row["snapshot_date"])
        cutout = PUBLIC_PLAYERS / "cutouts" / f"{slug}.png"
        editorial_cutout = PUBLIC_PLAYERS / "cutouts-editorial" / f"{slug}.webp"
        if cutout.exists() and not editorial_cutout.exists() and not dry_run:
            render_editorial_cutout(cutout, editorial_cutout)
        players.append({
            "id": slug,
            "sourcePlayerId": row["player_id"],
            "displayName": selection["display_name"],
            "aliases": [item for item in selection["aliases"].split("|") if item],
            "currentClub": row["club"], "league": row["league"], "nationalTeam": row["nationality"],
            "position": mapped_position(row["position"]), "rawPosition": row["position"],
            "age": age_on(birthdate, snapshot), "birthdate": birthdate.isoformat(),
            "dominantFoot": row["preferred_foot"] if row["preferred_foot"] in {"Left", "Right"} else "Unknown",
            "shirtNumber": 0, "fcOverall": int(row["overall_rating"]),
            "portraitUrl": portrait_url, "portraitStatus": portrait_status,
            "portraitEditorialUrl": f"/nutmeg/players/{slug}-editorial.webp" if portrait_status == "approved" else fallback,
            "portraitCutoutUrl": f"/nutmeg/players/cutouts/{slug}.png" if cutout.exists() else None,
            "portraitCutoutEditorialUrl": f"/nutmeg/players/cutouts-editorial/{slug}.webp" if editorial_cutout.exists() else None,
            "portraitCutoutStatus": "reviewed" if cutout.exists() else "unavailable",
            "wikidataId": qid, "sourceSnapshot": snapshot.isoformat(),
            "dataStatus": "prototype_source_licence_review_pending",
            "poolCategory": "men",
        })
        mappings.append({"sourcePlayerId": row["player_id"], "displayName": selection["display_name"], "wikidataId": qid, "resolution": resolution})

    return IngestResult(players, mappings, attributions, issues)


def write_outputs(result: IngestResult, dry_run: bool) -> None:
    summary = {
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "players": len(result.players),
        "verifiedIdentities": sum(1 for item in result.mappings if item["wikidataId"]),
        "approvedPortraits": sum(1 for item in result.players if item["portraitStatus"] == "approved"),
        "fallbackPortraits": sum(1 for item in result.players if item["portraitStatus"] == "fallback"),
        "reviewedCutouts": sum(1 for item in result.players if item["portraitCutoutStatus"] == "reviewed"),
        "issues": result.issues,
        "sourceLicenseStatus": "review_required",
    }
    if dry_run:
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        return
    GENERATED.mkdir(parents=True, exist_ok=True)
    PUBLIC_PLAYERS.mkdir(parents=True, exist_ok=True)
    outputs = {
        "players.json": result.players,
        "mappings.json": result.mappings,
        "attributions.json": result.attributions,
        "report.json": summary,
    }
    for name, payload in outputs.items():
        (GENERATED / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    report_lines = [
        "# Ten-player FC 27 ingestion report", "", f"Generated: {summary['generatedAt']}", "",
        f"- Players: {summary['players']}", f"- Verified Wikidata identities: {summary['verifiedIdentities']}",
        f"- Approved portraits: {summary['approvedPortraits']}", f"- Fallback portraits: {summary['fallbackPortraits']}",
        f"- Reviewed transparent cutouts: {summary['reviewedCutouts']}",
        "- Source redistribution licence: **review required**", "", "## Review queue",
    ]
    report_lines.extend(f"- **{item['player']}** — {item['issue']}" for item in result.issues)
    (GENERATED / "REPORT.md").write_text("\n".join(report_lines) + "\n")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Nutmeg's reviewed 10-player data preview")
    parser.add_argument("--source", type=Path, default=Path(os.environ.get("FC27_CSV", DEFAULT_SOURCE)))
    parser.add_argument("--offline", action="store_true", help="Use API cache only")
    parser.add_argument("--dry-run", action="store_true", help="Validate without publishing generated files")
    args = parser.parse_args()
    try:
        write_outputs(run(args.source, offline=args.offline, dry_run=args.dry_run), args.dry_run)
    except Exception as error:
        print(f"ingestion failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
