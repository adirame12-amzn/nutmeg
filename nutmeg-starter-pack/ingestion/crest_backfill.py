from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import unicodedata
from difflib import SequenceMatcher
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/generated/paper-trail"
PUBLIC_CLUBS = ROOT / "public/clubs"
SOURCE_REPOSITORY = "https://github.com/JoseArroyave/football-logos"
SOURCE_COMMIT = "5ab11fed47427b3003f4b276554491fe683387b1"
SOURCE_LICENSE = "MIT"
SOURCE_LICENSE_URL = f"{SOURCE_REPOSITORY}/blob/{SOURCE_COMMIT}/LICENSE"

STOP_WORDS = {
    "a", "b", "c", "f", "r", "s", "ac", "afc", "bc", "cd", "cf", "fc", "fk", "hsk", "if", "ifk", "nk",
    "osc", "rc", "rcd", "rsc", "sbv", "sc", "sd", "sl", "ssc", "sv", "tf",
    "tsg", "uc", "ud", "vfb", "vfl", "football", "futebol", "futbol", "calcio",
    "club", "da", "de", "do",
}

# Ambiguous names and aliases are reviewed explicitly rather than left to fuzzy matching.
OVERRIDES = {
    "1-fc-koln": "logos/germany/Cologne.svg",
    "aik-fotboll": "logos/sweden/AIK.svg",
    "amiens-sc": "logos/france/Amiens_SC.svg",
    "athletic-club": "logos/spain/Athletic_Club_Bilbao.svg",
    "brighton-hove-albion-f-c": "logos/england/Brighton.svg",
    "clube-de-regatas-do-flamengo": "logos/brazil/Flamengo.svg",
    "fc-red-bull-salzburg": "logos/austria/Salzburg.svg",
    "leicester-city-f-c": "logos/england/Leicester.svg",
    "nk-olimpija-ljubljana": "logos/slovenia/Olimpija.svg",
    "rcd-espanyol-de-barcelona": "logos/spain/Espanyol.svg",
    "real-betis-balompie": "logos/spain/Real_Betis.svg",
    "tottenham-hotspur-f-c": "logos/england/Tottenham.svg",
    "u-d-leiria": "logos/portugal/União_de_Leiria.svg",
    "vitoria-s-c": "logos/portugal/Vitória_de_Guimarães.svg",
    "west-ham-united-f-c": "logos/england/West_Ham.svg",
}

DANGEROUS_SVG = re.compile(
    r"<(?:script|foreignObject|iframe|object|embed)\b|\bon\w+\s*=|"
    r"(?:href|xlink:href)\s*=\s*['\"]https?://|url\(\s*['\"]?https?://",
    re.IGNORECASE,
)


def normalise(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    words = re.sub(r"[^a-z0-9]+", " ", ascii_value.casefold().replace("&", " and ")).split()
    return " ".join(word for word in words if word not in STOP_WORDS)


def source_index(source_root: Path) -> list[tuple[str, str]]:
    return [
        (path.relative_to(source_root).as_posix(), normalise(path.stem.replace("_", " ")))
        for path in sorted((source_root / "logos").glob("*/*.svg"))
    ]


def resolve_source(club: dict, candidates: list[tuple[str, str]]) -> tuple[str | None, float]:
    if club["id"] in OVERRIDES:
        return OVERRIDES[club["id"]], 1.0
    target = normalise(club["name"])
    scored: list[tuple[float, str]] = []
    for source_path, candidate in candidates:
        score = SequenceMatcher(None, target, candidate).ratio()
        if target == candidate:
            score = 1.0
        elif target and candidate and (target in candidate or candidate in target):
            score += 0.08
        scored.append((score, source_path))
    score, source_path = max(scored, default=(0.0, ""))
    return (source_path, score) if score >= 0.78 else (None, score)


def validate_svg(source: Path) -> str:
    content = source.read_text(encoding="utf-8")
    if "<svg" not in content[:1000].casefold():
        raise ValueError(f"Not an SVG: {source}")
    if DANGEROUS_SVG.search(content):
        raise ValueError(f"Unsafe external or executable SVG content: {source}")
    return content


def initials(name: str) -> str:
    words = [word for word in re.split(r"\W+", name, flags=re.UNICODE) if word]
    return "".join(word[0] for word in words[:3]).upper() or "FC"


def generated_badge(club: dict) -> str:
    palette = [
        ("#1d1d1b", "#ef5a1b"), ("#273b9f", "#f5f0e6"),
        ("#9c2f28", "#f3d264"), ("#21574a", "#f5f0e6"),
    ]
    primary, accent = palette[int(hashlib.sha256(club["id"].encode()).hexdigest()[:2], 16) % len(palette)]
    mark = escape(initials(club["name"]))
    label = escape(club["name"])
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" '
        f'aria-label="Editorial fallback badge for {label}">'
        f'<path fill="{primary}" stroke="#1d1d1b" stroke-width="7" d="M80 7 143 29v55c0 35-25 57-63 70C42 141 17 119 17 84V29Z"/>'
        f'<path fill="none" stroke="{accent}" stroke-width="5" d="M34 43h92M31 103h98"/>'
        f'<text x="80" y="91" text-anchor="middle" fill="{accent}" font-family="Georgia,serif" font-size="43" font-weight="900">{mark}</text>'
        '</svg>\n'
    )


def update_outputs(source_root: Path) -> dict:
    clubs_path = OUTPUT / "clubs.json"
    puzzles_path = OUTPUT / "puzzles.json"
    attributions_path = OUTPUT / "attributions.json"
    report_path = OUTPUT / "report.json"
    clubs = json.loads(clubs_path.read_text())
    puzzles = json.loads(puzzles_path.read_text())
    attributions = json.loads(attributions_path.read_text())
    report = json.loads(report_path.read_text())
    candidates = source_index(source_root)
    manifest = []
    repository_count = 0
    generated_count = 0
    resolved_club_names: set[str] = set()

    attributions = [item for item in attributions if item.get("sourceType") != "repository_backfill"]
    for club in clubs:
        if club.get("crestStatus") == "approved_metadata":
            continue
        source_path, score = resolve_source(club, candidates)
        destination = PUBLIC_CLUBS / f"{club['id']}.svg"
        if source_path:
            source = source_root / source_path
            validate_svg(source)
            shutil.copyfile(source, destination)
            club.update({
                "crestSourceFile": source_path,
                "crestUrl": f"/nutmeg/clubs/{club['id']}.svg",
                "crestEditorialUrl": None,
                "crestStatus": "approved_repository_mit",
            })
            attributions.append({
                "clubId": club["id"], "wikidataId": club["wikidataId"],
                "file": source_path,
                "sourcePage": f"{SOURCE_REPOSITORY}/blob/{SOURCE_COMMIT}/{source_path}",
                "creator": "Jose Arroyave / football-logos contributors",
                "license": SOURCE_LICENSE, "licenseUrl": SOURCE_LICENSE_URL,
                "status": "approved", "sourceType": "repository_backfill",
            })
            repository_count += 1
            resolved_club_names.add(club["name"])
            kind = "repository"
        else:
            destination.write_text(generated_badge(club), encoding="utf-8")
            club.update({
                "crestSourceFile": None,
                "crestUrl": f"/nutmeg/clubs/{club['id']}.svg",
                "crestEditorialUrl": None,
                "crestStatus": "generated_editorial_fallback",
            })
            generated_count += 1
            kind = "generated_editorial_fallback"
        manifest.append({
            "clubId": club["id"], "clubName": club["name"], "kind": kind,
            "sourcePath": source_path, "matchScore": round(score, 4),
        })

    clubs_by_id = {club["id"]: club for club in clubs}
    for puzzle in puzzles:
        for stint in puzzle["clubs"]:
            club = clubs_by_id[stint["clubId"]]
            stint.update({
                "crestUrl": club.get("crestUrl"),
                "crestEditorialUrl": club.get("crestEditorialUrl"),
                "crestStatus": club["crestStatus"],
            })

    report["issues"] = [
        issue for issue in report.get("issues", [])
        if not (
            issue.get("item") in resolved_club_names
            and (
                issue.get("issue", "").startswith("no Wikidata P154 crest")
                or issue.get("issue", "").startswith("crest ")
            )
        )
    ]
    report.update({
        "approvedCrests": sum(club["crestStatus"].startswith("approved_") for club in clubs),
        "fallbackCrests": generated_count,
        "repositoryBackfillCrests": repository_count,
        "generatedEditorialBadges": generated_count,
        "crestSourceRepository": SOURCE_REPOSITORY,
        "crestSourceCommit": SOURCE_COMMIT,
        "crestSourceLicense": SOURCE_LICENSE,
    })
    clubs_path.write_text(json.dumps(clubs, ensure_ascii=False, indent=2) + "\n")
    puzzles_path.write_text(json.dumps(puzzles, ensure_ascii=False, indent=2) + "\n")
    attributions_path.write_text(json.dumps(attributions, ensure_ascii=False, indent=2) + "\n")
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    (OUTPUT / "crest-source-manifest.json").write_text(json.dumps({
        "repository": SOURCE_REPOSITORY, "commit": SOURCE_COMMIT,
        "license": SOURCE_LICENSE, "licenseUrl": SOURCE_LICENSE_URL,
        "entries": manifest,
    }, ensure_ascii=False, indent=2) + "\n")

    markdown_path = OUTPUT / "REPORT.md"
    markdown = markdown_path.read_text()
    markdown = re.sub(r"- Approved clean \+ editorial crests: \d+", f"- Approved crest assets: {report['approvedCrests']}", markdown)
    markdown = re.sub(r"- Text fallbacks pending licence review: \d+", f"- Generated editorial fallback badges: {generated_count}", markdown)
    source_note = f"- MIT repository crest backfills: {repository_count} (pinned commit `{SOURCE_COMMIT[:12]}`)"
    if source_note not in markdown:
        markdown = markdown.replace(f"- Approved crest assets: {report['approvedCrests']}\n", f"- Approved crest assets: {report['approvedCrests']}\n{source_note}\n")
    review_heading = "## Review queue\n\n"
    if review_heading in markdown:
        markdown = markdown.split(review_heading, 1)[0] + review_heading
        markdown += "\n".join(f"- **{issue['item']}** — {issue['issue']}" for issue in report["issues"]) + "\n"
    markdown_path.write_text(markdown)
    return {"clubs": len(clubs), "repository": repository_count, "generated": generated_count}


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill Paper Trail club badges from a reviewed MIT source checkout")
    parser.add_argument("--source", type=Path, required=True, help="Checkout of JoseArroyave/football-logos at the pinned commit")
    args = parser.parse_args()
    actual_commit = subprocess.check_output(
        ["git", "-C", str(args.source), "rev-parse", "HEAD"], text=True,
    ).strip()
    if actual_commit != SOURCE_COMMIT:
        raise SystemExit(f"Expected source commit {SOURCE_COMMIT}, found {actual_commit}")
    print(json.dumps(update_outputs(args.source), indent=2))


if __name__ == "__main__":
    main()
