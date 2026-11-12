import tempfile
import unittest
from pathlib import Path

from PIL import Image

from ingestion.club_history import classify_team, dedupe_stints, render_editorial_crest


def team(label, description, types=()):
    return {
        "labels": {"en": {"value": label}},
        "descriptions": {"en": {"value": description}},
        "claims": {
            "P31": [{"mainsnak": {"datavalue": {"value": {"id": qid}}}} for qid in types]
        },
    }


class ClubHistoryTests(unittest.TestCase):
    def test_excludes_national_and_reserve_teams(self):
        self.assertEqual(classify_team(team("France", "national association football team", ("Q6979593",)), "Q1")[0], "excluded_national")
        self.assertEqual(classify_team(team("Example B", "association football reserve team", ("Q2412834",)), "Q2")[0], "excluded_development")
        self.assertEqual(classify_team(team("Example cantera", "football development system", ("Q476028",)), "Q4")[0], "excluded_development")
        self.assertEqual(classify_team(team("Example FC", "professional association football club", ("Q476028",)), "Q3")[0], "senior_club")

    def test_deduplicates_repeat_spells_and_preserves_chronology(self):
        stints = [
            {"clubId": "two", "name": "Two FC", "start": "2020", "end": "2021", "appearances": 10},
            {"clubId": "one", "name": "One FC", "start": "2016", "end": "2018", "appearances": 20},
            {"clubId": "one", "name": "One FC", "start": "2022", "end": "2023", "appearances": 5},
        ]
        result = dedupe_stints(stints)
        self.assertEqual([stint["clubId"] for stint in result], ["one", "two"])
        self.assertEqual(result[0]["repeatSpells"], 2)
        self.assertEqual(result[0]["end"], "2023")
        self.assertEqual(result[0]["appearances"], 25)

    def test_editorial_crest_keeps_transparency(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "clean.webp"
            output = Path(temporary) / "editorial.webp"
            image = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
            for x in range(40, 120):
                for y in range(30, 130):
                    image.putpixel((x, y), (200, 30, 20, 255))
            image.save(source, "WEBP", lossless=True)
            render_editorial_crest(source, output)
            with Image.open(output) as processed:
                self.assertEqual(processed.mode, "RGBA")
                self.assertEqual(processed.getpixel((0, 0))[3], 0)
                self.assertGreater(processed.getpixel((80, 80))[3], 200)


if __name__ == "__main__":
    unittest.main()
