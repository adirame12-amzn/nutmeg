from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/generated/rating-85-plus/players.json"
PAPER_TRAIL_SOURCE = ROOT / "data/generated/paper-trail/puzzles.json"
OUTPUT = ROOT / "worker/seed.sql"


def sql(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main() -> None:
    players = json.loads(SOURCE.read_text())
    paper_trails = json.loads(PAPER_TRAIL_SOURCE.read_text())
    lines = ["-- Generated from the reviewed 85+ prototype catalogue."]
    for player in players:
        values = [
            player["id"], player["displayName"], player["currentClub"], player["league"],
            player["nationalTeam"], player["position"], player["age"], player.get("fcOverall"),
            player.get("portraitUrl"), player.get("portraitEditorialUrl"),
            player.get("portraitCutoutEditorialUrl"), 1,
        ]
        lines.append(
            "INSERT INTO players "
            "(id, display_name, club, league, nation, position, age, fc_overall, portrait_url, portrait_editorial_url, portrait_cutout_editorial_url, eligible_answer) VALUES "
            f"({', '.join(sql(value) for value in values)}) "
            "ON CONFLICT(id) DO UPDATE SET "
            "display_name = excluded.display_name, club = excluded.club, league = excluded.league, "
            "nation = excluded.nation, position = excluded.position, age = excluded.age, "
            "fc_overall = excluded.fc_overall, portrait_url = excluded.portrait_url, "
            "portrait_editorial_url = excluded.portrait_editorial_url, "
            "portrait_cutout_editorial_url = excluded.portrait_cutout_editorial_url, "
            "eligible_answer = excluded.eligible_answer;"
        )
    lines.extend(["", "-- Ranked Paper Trail paths; the daily answer remains server-side."])
    for path in paper_trails:
        values = [path["playerId"], json.dumps(path["clubs"], ensure_ascii=False, separators=(",", ":")), path["sourceSnapshot"], path["sourceUrl"]]
        lines.append(
            "INSERT INTO paper_trail_paths "
            "(player_id, clubs_json, source_snapshot, source_url) VALUES "
            f"({', '.join(sql(value) for value in values)}) "
            "ON CONFLICT(player_id) DO UPDATE SET "
            "clubs_json = excluded.clubs_json, "
            "source_snapshot = excluded.source_snapshot, "
            "source_url = excluded.source_url;"
        )
    lines.append("")
    OUTPUT.write_text("\n".join(lines))
    print(f"wrote {len(players)} players and {len(paper_trails)} Paper Trail paths to {OUTPUT}")


if __name__ == "__main__":
    main()
