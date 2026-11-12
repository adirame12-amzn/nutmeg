from pathlib import Path
from unittest import TestCase

from ingestion.crest_backfill import OVERRIDES, normalise, resolve_source


class CrestBackfillTests(TestCase):
    def test_normalises_common_club_suffixes(self):
        self.assertEqual(normalise("Manchester City F.C."), "manchester city")
        self.assertEqual(normalise("Real Madrid Club de Fútbol"), "real madrid")

    def test_reviewed_overrides_prevent_ambiguous_matches(self):
        candidates = [
            ("logos/brazil/Athletic.svg", "athletic"),
            ("logos/spain/Athletic_Club_Bilbao.svg", "athletic bilbao"),
        ]
        source, score = resolve_source({"id": "athletic-club", "name": "Athletic Club"}, candidates)
        self.assertEqual(source, OVERRIDES["athletic-club"])
        self.assertEqual(score, 1.0)

    def test_requires_a_strong_unreviewed_match(self):
        candidates = [("logos/spain/Sevilla.svg", normalise(Path("Sevilla.svg").stem))]
        self.assertEqual(resolve_source({"id": "sevilla-fc", "name": "Sevilla FC"}, candidates)[0], "logos/spain/Sevilla.svg")
        self.assertIsNone(resolve_source({"id": "unknown", "name": "Different Town"}, candidates)[0])
