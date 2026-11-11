from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/generated/rating-85-plus/players.json"
OUTPUT = ROOT / "worker/seed.sql"


def sql(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main() -> None:
    players = json.loads(SOURCE.read_text())
    lines = ["-- Generated from the reviewed 85+ prototype catalogue."]
    for player in players:
        values = [
            player["id"], player["displayName"], player["currentClub"], player["league"],
            player["nationalTeam"], player["position"], player["age"], player.get("fcOverall"),
            player.get("portraitUrl"), player.get("portraitEditorialUrl"),
            player.get("portraitCutoutEditorialUrl"), 1,
        ]
        lines.append(
            "INSERT OR REPLACE INTO players "
            "(id, display_name, club, league, nation, position, age, fc_overall, portrait_url, portrait_editorial_url, portrait_cutout_editorial_url, eligible_answer) VALUES "
            f"({', '.join(sql(value) for value in values)});"
        )
    lines.append("")
    OUTPUT.write_text("\n".join(lines))
    print(f"wrote {len(players)} players to {OUTPUT}")


if __name__ == "__main__":
    main()
