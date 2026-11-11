from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from .rating_catalog import ROOT, write_database


def merge_catalogs(min_rating: int, max_rating: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    players: list[dict[str, Any]] = []
    attributions: list[dict[str, Any]] = []
    for rating in range(min_rating, max_rating + 1):
        source = ROOT / "data/generated" / f"rating-{rating}"
        players.extend(json.loads((source / "players.json").read_text()))
        attributions.extend(json.loads((source / "attributions.json").read_text()))
    players_by_id = {player["id"]: player for player in players}
    attributions_by_id = {item["playerId"]: item for item in attributions}
    return (
        sorted(players_by_id.values(), key=lambda player: (-player["fcOverall"], player["displayName"].casefold())),
        sorted(attributions_by_id.values(), key=lambda item: item["playerId"]),
    )


def write_outputs(min_rating: int, max_rating: int, players: list[dict[str, Any]], attributions: list[dict[str, Any]]) -> None:
    output = ROOT / "data/generated" / f"rating-{min_rating}-plus"
    output.mkdir(parents=True, exist_ok=True)
    report = {
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "minimumRating": min_rating,
        "maximumRating": max_rating,
        "players": len(players),
        "verifiedIdentities": sum(1 for player in players if player["wikidataId"]),
        "publishedPortraits": sum(1 for player in players if player["portraitStatus"] != "fallback"),
        "fallbackPortraits": sum(1 for player in players if player["portraitStatus"] == "fallback"),
        "processedCutouts": sum(1 for player in players if player.get("portraitCutoutUrl")),
        "sourceLicenseStatus": "review_required",
    }
    (output / "players.json").write_text(json.dumps(players, ensure_ascii=False, indent=2) + "\n")
    (output / "attributions.json").write_text(json.dumps(attributions, ensure_ascii=False, indent=2) + "\n")
    (output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    write_database(output / "players.sqlite", players, attributions)
    (output / "REPORT.md").write_text(
        f"# Men's FC {min_rating}+ catalogue\n\n"
        f"Generated: {report['generatedAt']}\n\n"
        f"- Players: {report['players']}\n"
        f"- Ratings: {min_rating}–{max_rating}\n"
        f"- Verified identities: {report['verifiedIdentities']}\n"
        f"- Published clean + editorial portraits: {report['publishedPortraits']}\n"
        f"- Fallback portraits: {report['fallbackPortraits']}\n"
        f"- Transparent editorial cutouts: {report['processedCutouts']}\n"
        "- Source redistribution licence: **review required**\n"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge exact-rating catalogues into one playable range")
    parser.add_argument("--min-rating", type=int, default=85)
    parser.add_argument("--max-rating", type=int, default=91)
    args = parser.parse_args()
    players, attributions = merge_catalogs(args.min_rating, args.max_rating)
    write_outputs(args.min_rating, args.max_rating, players, attributions)


if __name__ == "__main__":
    main()
