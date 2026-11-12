from __future__ import annotations

import argparse
import json
import math
import re
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Iterable

import requests
from PIL import Image, ImageDraw, ImageEnhance, ImageOps

from .pipeline import (
    COMMONS_API,
    USER_AGENT,
    WIKIDATA_API,
    CachedApi,
    clean_html,
    licence_status,
    normalise_text,
    slugify,
)

ROOT = Path(__file__).resolve().parents[1]
PLAYERS = ROOT / "data/generated/rating-85-plus/players.json"
OUTPUT = ROOT / "data/generated/paper-trail"
PUBLIC_CLUBS = ROOT / "public/clubs"
SOURCE_NAME = "Wikidata P54 member-of-sports-team statements"
SCORING_VERSION = "paper-trail-v1"

# These types and text patterns are deliberately conservative. Ambiguous teams are
# retained in the review report but are not published as senior clubs.
NATIONAL_TEAM_TYPES = {"Q6979593"}
RESERVE_TEAM_TYPES = {"Q2412834"}
EXCLUDED_TEXT = re.compile(
    r"\b(national|reserve|academy|cantera|youth|under[- ]?\d{2}s?|u[- ]?\d{2}|olympic)\b",
    re.IGNORECASE,
)
SQUAD_SUFFIX = re.compile(r"(?:\s|[-–])(B|C|II)$", re.IGNORECASE)

# CC BY-SA crest files require a deliberate visual/licence review before they can
# be added here. Keeping this empty makes the default pipeline fail closed.
CREST_REVIEW_OVERRIDES: set[str] = set()


def chunks(values: list[str], size: int = 45) -> Iterable[list[str]]:
    for index in range(0, len(values), size):
        yield values[index:index + size]


def get_entities(api: CachedApi, qids: list[str]) -> dict[str, dict[str, Any]]:
    entities: dict[str, dict[str, Any]] = {}
    for group in chunks(sorted(set(qids))):
        payload = api.get(WIKIDATA_API, {
            "action": "wbgetentities", "format": "json", "ids": "|".join(group),
            "props": "claims|labels|descriptions", "languages": "en",
        })
        entities.update(payload.get("entities", {}))
    return entities


def entity_label(entity: dict[str, Any], fallback: str) -> str:
    return entity.get("labels", {}).get("en", {}).get("value", fallback)


def entity_description(entity: dict[str, Any]) -> str:
    return entity.get("descriptions", {}).get("en", {}).get("value", "")


def claim_item_id(statement: dict[str, Any]) -> str | None:
    value = statement.get("mainsnak", {}).get("datavalue", {}).get("value")
    return value.get("id") if isinstance(value, dict) else None


def first_time(statement: dict[str, Any], prop: str) -> str | None:
    values = statement.get("qualifiers", {}).get(prop, [])
    if not values:
        return None
    value = values[0].get("datavalue", {}).get("value")
    if not isinstance(value, dict):
        return None
    raw = value.get("time", "")
    match = re.match(r"^[+-](\d{4})(?:-(\d{2}))?(?:-(\d{2}))?", raw)
    if not match:
        return None
    year, month, day = match.groups()
    if not month or month == "00":
        return year
    if not day or day == "00":
        return f"{year}-{month}"
    return f"{year}-{month}-{day}"


def appearances(statement: dict[str, Any]) -> int | None:
    values = statement.get("qualifiers", {}).get("P1350", [])
    if not values:
        return None
    amount = values[0].get("datavalue", {}).get("value", {}).get("amount")
    try:
        return int(amount)
    except (TypeError, ValueError):
        return None


def claim_item_ids(entity: dict[str, Any], prop: str) -> set[str]:
    return {
        qid for statement in entity.get("claims", {}).get(prop, [])
        if (qid := claim_item_id(statement))
    }


def media_claim(entity: dict[str, Any], prop: str) -> str | None:
    claims = entity.get("claims", {}).get(prop, [])
    if not claims:
        return None
    value = claims[0].get("mainsnak", {}).get("datavalue", {}).get("value")
    return value if isinstance(value, str) else None


def classify_team(entity: dict[str, Any], qid: str) -> tuple[str, str]:
    label = entity_label(entity, qid)
    description = entity_description(entity)
    types = claim_item_ids(entity, "P31")
    searchable = f"{label} {description}"
    if types & NATIONAL_TEAM_TYPES or "national" in normalise_text(searchable):
        return "excluded_national", "national team"
    if types & RESERVE_TEAM_TYPES or EXCLUDED_TEXT.search(searchable) or SQUAD_SUFFIX.search(label):
        return "excluded_development", "youth or reserve team"
    if not label or label == qid:
        return "review_required", "missing English team label"
    return "senior_club", "Wikidata team statement passed conservative exclusions"


def raw_team_claims(player_entity: dict[str, Any]) -> list[dict[str, Any]]:
    claims: list[dict[str, Any]] = []
    for statement in player_entity.get("claims", {}).get("P54", []):
        if statement.get("rank") == "deprecated":
            continue
        team_qid = claim_item_id(statement)
        if team_qid:
            claims.append({
                "clubId": team_qid,
                "start": first_time(statement, "P580"),
                "end": first_time(statement, "P582"),
                "appearances": appearances(statement),
                "rank": statement.get("rank", "normal"),
            })
    return claims


def dedupe_stints(stints: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for stint in stints:
        existing = grouped.get(stint["clubId"])
        if not existing:
            grouped[stint["clubId"]] = {**stint, "repeatSpells": 1}
            continue
        existing["repeatSpells"] += 1
        dates = [value for value in (existing.get("start"), stint.get("start")) if value]
        existing["start"] = min(dates) if dates else None
        dates = [value for value in (existing.get("end"), stint.get("end")) if value]
        existing["end"] = max(dates) if dates else None
        appearance_values = [value for value in (existing.get("appearances"), stint.get("appearances")) if value is not None]
        existing["appearances"] = sum(appearance_values) if appearance_values else None
    return sorted(grouped.values(), key=lambda item: (item.get("start") or "9999", item["name"].casefold()))


def commons_metadata(api: CachedApi, filename: str) -> dict[str, Any] | None:
    payload = api.get(COMMONS_API, {
        "action": "query", "format": "json", "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": 512,
        "titles": f"File:{filename}",
    })
    pages = payload.get("query", {}).get("pages", {})
    info = next(iter(pages.values()), {}).get("imageinfo", [])
    return info[0] if info else None


def render_clean_crest(url: str, destination: Path) -> None:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=45)
    response.raise_for_status()
    with Image.open(BytesIO(response.content)) as source:
        converted = ImageOps.exif_transpose(source).convert("RGBA")
        converted.thumbnail((132, 132), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
        canvas.alpha_composite(converted, ((160 - converted.width) // 2, (160 - converted.height) // 2))
        destination.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(destination, "WEBP", quality=88, method=6)


def render_editorial_crest(source: Path, destination: Path) -> None:
    with Image.open(source) as clean:
        clean = clean.convert("RGBA")
        alpha = clean.getchannel("A")
        grayscale = ImageOps.autocontrast(clean.convert("L"), cutoff=1)
        grayscale = ImageEnhance.Contrast(grayscale).enhance(1.18)
        treated = ImageOps.colorize(grayscale, black="#1d1d1b", white="#ef5a1b").convert("RGBA")
        treated.putalpha(alpha)
        dots = Image.new("RGBA", treated.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(dots)
        pixels, opacity = grayscale.load(), alpha.load()
        for y in range(2, 160, 4):
            for x in range(2, 160, 4):
                darkness = 255 - pixels[x, y]
                if opacity[x, y] > 40 and darkness > 90:
                    draw.ellipse((x - .6, y - .6, x + .6, y + .6), fill=(29, 29, 27, 65))
        Image.alpha_composite(treated, dots).save(destination, "WEBP", quality=88, method=6)


def crest_record(api: CachedApi, club: dict[str, Any], *, dry_run: bool) -> tuple[dict[str, Any], dict[str, Any] | None, str | None]:
    filename = club.get("crestSourceFile")
    if not filename:
        return club, None, "no Wikidata P154 crest"
    info = commons_metadata(api, filename)
    if not info:
        return club, None, "crest metadata unavailable"
    metadata = info.get("extmetadata", {})
    license_name = metadata.get("LicenseShortName", {}).get("value", "Unknown")
    review = "approved" if club["id"] in CREST_REVIEW_OVERRIDES else ""
    status = licence_status(license_name, review)
    attribution = {
        "clubId": club["id"], "wikidataId": club["wikidataId"], "file": filename,
        "sourcePage": f"https://commons.wikimedia.org/wiki/File:{filename.replace(' ', '_')}",
        "creator": clean_html(metadata.get("Artist", {}).get("value", "Unknown")),
        "license": license_name,
        "licenseUrl": metadata.get("LicenseUrl", {}).get("value", ""),
        "status": status,
    }
    if status != "approved":
        return {**club, "crestStatus": status}, attribution, f"crest {status}: {license_name}"
    clean_url = f"/nutmeg/clubs/{club['id']}.webp"
    editorial_url = f"/nutmeg/clubs/{club['id']}-editorial.webp"
    if not dry_run:
        clean_path = PUBLIC_CLUBS / f"{club['id']}.webp"
        editorial_path = PUBLIC_CLUBS / f"{club['id']}-editorial.webp"
        if not clean_path.exists():
            render_clean_crest(info.get("thumburl") or info["url"], clean_path)
        if not editorial_path.exists():
            render_editorial_crest(clean_path, editorial_path)
    return {
        **club, "crestUrl": clean_url, "crestEditorialUrl": editorial_url,
        "crestStatus": "approved_metadata",
    }, attribution, None


def build_catalog(*, offline: bool = False, dry_run: bool = False) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, str]]]:
    players = json.loads(PLAYERS.read_text())
    player_qids = [player["wikidataId"] for player in players if player.get("wikidataId")]
    api = CachedApi(offline=offline)
    player_entities = get_entities(api, player_qids)
    claims_by_player = {
        player["id"]: raw_team_claims(player_entities.get(player.get("wikidataId"), {}))
        for player in players
    }
    team_qids = sorted({claim["clubId"] for claims in claims_by_player.values() for claim in claims})
    team_entities = get_entities(api, team_qids)
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    issues: list[dict[str, str]] = []
    clubs_by_qid: dict[str, dict[str, Any]] = {}

    for team_qid in team_qids:
        entity = team_entities.get(team_qid, {})
        classification, reason = classify_team(entity, team_qid)
        label = entity_label(entity, team_qid)
        club_id = slugify(label) or team_qid.casefold()
        clubs_by_qid[team_qid] = {
            "id": club_id, "wikidataId": team_qid, "name": label,
            "description": entity_description(entity), "classification": classification,
            "classificationReason": reason, "crestSourceFile": media_claim(entity, "P154"),
            "crestUrl": None, "crestEditorialUrl": None, "crestStatus": "fallback",
            "sourceUrl": f"https://www.wikidata.org/wiki/{team_qid}",
        }

    published_clubs: dict[str, dict[str, Any]] = {}
    attributions: list[dict[str, Any]] = []
    for team_qid, club in clubs_by_qid.items():
        if club["classification"] != "senior_club":
            continue
        processed, attribution, issue = crest_record(api, club, dry_run=dry_run)
        published_clubs[team_qid] = processed
        if attribution:
            attributions.append(attribution)
        if issue:
            issues.append({"item": club["name"], "issue": issue})

    histories: list[dict[str, Any]] = []
    for player in players:
        raw_claims = claims_by_player.get(player["id"], [])
        senior_stints = []
        excluded = []
        for claim in raw_claims:
            club = clubs_by_qid[claim["clubId"]]
            record = {
                **claim, "clubId": club["id"], "wikidataClubId": club["wikidataId"],
                "name": club["name"], "classification": club["classification"],
            }
            # P54 also contains academy membership. A positive P1350 senior
            # appearance count is the publishable evidence boundary.
            if club["classification"] == "senior_club" and (claim.get("appearances") or 0) > 0:
                senior_stints.append(record)
            else:
                if club["classification"] == "senior_club":
                    record["classification"] = "excluded_no_senior_appearances"
                excluded.append(record)
        senior_stints = dedupe_stints(senior_stints)
        eligible = len(senior_stints) >= 2
        if not eligible:
            issues.append({"item": player["displayName"], "issue": f"only {len(senior_stints)} senior club claims after exclusions"})
        histories.append({
            "playerId": player["id"], "wikidataId": player.get("wikidataId"),
            "playerName": player["displayName"], "eligible": eligible,
            "verificationStatus": "wikidata_claims_review_pending",
            "sourceName": SOURCE_NAME,
            "sourceUrl": f"https://www.wikidata.org/wiki/{player.get('wikidataId')}#P54" if player.get("wikidataId") else None,
            "sourceSnapshot": generated_at[:10], "clubs": senior_stints,
            "excludedClaims": excluded,
        })

    clubs = sorted(published_clubs.values(), key=lambda item: item["name"].casefold())
    histories.sort(key=lambda item: item["playerName"].casefold())
    return histories, clubs, attributions, issues


def write_review_sheet(clubs: list[dict[str, Any]], output: Path) -> None:
    columns, cell = 6, 190
    rows = max(1, math.ceil(len(clubs) / columns))
    sheet = Image.new("RGB", (columns * cell, rows * cell), "#eee3cf")
    draw = ImageDraw.Draw(sheet)
    for index, club in enumerate(clubs):
        x, y = (index % columns) * cell, (index // columns) * cell
        if club.get("crestEditorialUrl"):
            path = ROOT / "public" / club["crestEditorialUrl"].replace("/nutmeg/", "")
            if path.exists():
                with Image.open(path) as image:
                    image = image.convert("RGBA")
                    sheet.paste(image.convert("RGB"), (x + 15, y + 5), image.getchannel("A"))
        draw.text((x + 8, y + 168), club["name"][:27], fill="#1d1d1b")
    sheet.save(output / "crests-contact-sheet.jpg", quality=88)


def write_outputs(histories: list[dict[str, Any]], clubs: list[dict[str, Any]], attributions: list[dict[str, Any]], issues: list[dict[str, str]], *, dry_run: bool) -> None:
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "players": len(histories),
        "eligiblePlayers": sum(1 for history in histories if history["eligible"]),
        "fullFiveClubPlayers": sum(1 for history in histories if len(history["clubs"]) >= 5),
        "distinctSeniorClubs": len(clubs),
        "approvedCrests": sum(1 for club in clubs if club["crestStatus"] == "approved_metadata"),
        "fallbackCrests": sum(1 for club in clubs if club["crestStatus"] != "approved_metadata"),
        "source": SOURCE_NAME,
        "verificationStatus": "editorial_review_required",
        "scoringVersion": SCORING_VERSION,
        "issues": issues,
    }
    if dry_run:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return
    OUTPUT.mkdir(parents=True, exist_ok=True)
    clubs_by_id = {club["id"]: club for club in clubs}
    puzzles = []
    for history in histories:
        if not history["eligible"]:
            continue
        puzzle_clubs = []
        for stint in history["clubs"][:5]:
            asset = clubs_by_id[stint["clubId"]]
            puzzle_clubs.append({
                "clubId": stint["clubId"], "wikidataClubId": stint["wikidataClubId"],
                "name": stint["name"], "start": stint["start"], "end": stint["end"],
                "appearances": stint["appearances"], "crestUrl": asset.get("crestUrl"),
                "crestEditorialUrl": asset.get("crestEditorialUrl"), "crestStatus": asset["crestStatus"],
                "sourceUrl": asset["sourceUrl"],
            })
        puzzles.append({
            "playerId": history["playerId"], "sourceSnapshot": history["sourceSnapshot"],
            "sourceUrl": history["sourceUrl"], "clubs": puzzle_clubs,
        })
    for name, payload in (
        ("club-histories.json", histories), ("clubs.json", clubs),
        ("puzzles.json", puzzles), ("attributions.json", attributions), ("report.json", report),
    ):
        (OUTPUT / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    write_review_sheet(clubs, OUTPUT)
    lines = [
        "# Paper Trail data report", "", f"Generated: {report['generatedAt']}", "",
        f"- Player records audited: {report['players']}",
        f"- Eligible with 2+ senior clubs: {report['eligiblePlayers']}",
        f"- Full five-club journeys: {report['fullFiveClubPlayers']}",
        f"- Distinct senior clubs: {report['distinctSeniorClubs']}",
        f"- Approved clean + editorial crests: {report['approvedCrests']}",
        f"- Text fallbacks pending licence review: {report['fallbackCrests']}",
        "- Club history source: Wikidata P54, including P580/P582 qualifiers where present",
        "- Status: **prototype / editorial completeness review required**", "",
        "## Policy", "",
        "Senior loans are included. Youth, reserve and national-team claims are excluded. Repeat spells are deduplicated for display. The earliest five chronological distinct clubs form a five-card puzzle; missing slots stay visibly unavailable.",
        "", "## Review queue", "",
    ]
    lines.extend(f"- **{issue['item']}** — {issue['issue']}" for issue in issues)
    (OUTPUT / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps(report, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local Paper Trail club histories and crest assets")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    histories, clubs, attributions, issues = build_catalog(offline=args.offline, dry_run=args.dry_run)
    write_outputs(histories, clubs, attributions, issues, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
