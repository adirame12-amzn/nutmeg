import csv
import sqlite3
import tempfile
import unittest
from pathlib import Path

from ingestion.rating_catalog import player_name, source_cohort, write_database


class RatingCatalogTests(unittest.TestCase):
    def test_filters_exact_rating_and_mens_category(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "players.csv"
            fields = ["player_id", "common_name", "first_name", "last_name", "overall_rating", "gender"]
            with source.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                writer.writerows([
                    {"player_id": "1", "common_name": "", "first_name": "Men", "last_name": "Player", "overall_rating": "85", "gender": "Men's Football"},
                    {"player_id": "2", "common_name": "Other", "first_name": "", "last_name": "", "overall_rating": "84", "gender": "Men's Football"},
                    {"player_id": "3", "common_name": "Excluded", "first_name": "", "last_name": "", "overall_rating": "85", "gender": "Women's Football"},
                ])
            cohort = source_cohort(source, 85)
            self.assertEqual([row["player_id"] for row in cohort], ["1"])
            self.assertEqual(player_name(cohort[0]), "Men Player")

    def test_writes_queryable_sqlite_database(self):
        player = {
            "id": "example", "sourcePlayerId": "1", "displayName": "Example Player", "aliases": ["Example"],
            "fcOverall": 85, "rawPosition": "CM", "position": "Midfielder", "currentClub": "Example FC",
            "league": "Example League", "nationalTeam": "Example", "dominantFoot": "Right",
            "birthdate": "2000-01-01", "age": 26, "sourceSnapshot": "2026-09-12", "wikidataId": "Q1",
            "identityStatus": "verified", "portraitUrl": "/clean.webp", "portraitEditorialUrl": "/editorial.webp",
            "portraitStatus": "reviewed_metadata", "portraitCutoutUrl": "/cutout.png",
            "portraitCutoutEditorialUrl": "/cutout-editorial.webp", "portraitCutoutStatus": "auto_review_pending",
            "poolCategory": "men", "dataStatus": "prototype",
        }
        attribution = {
            "playerId": "example", "wikidataId": "Q1", "file": "Example.jpg", "sourcePage": "https://example.com",
            "creator": "Creator", "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
            "status": "approved",
        }
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "players.sqlite"
            write_database(output, [player], [attribution])
            with sqlite3.connect(output) as connection:
                self.assertEqual(connection.execute("SELECT display_name, fc_overall FROM players").fetchone(), ("Example Player", 85))
                self.assertEqual(connection.execute("SELECT cutout_status FROM players").fetchone()[0], "auto_review_pending")
                self.assertEqual(connection.execute("SELECT license FROM attributions").fetchone()[0], "CC BY-SA 4.0")


if __name__ == "__main__":
    unittest.main()
