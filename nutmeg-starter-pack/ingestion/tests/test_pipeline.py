import tempfile
import unittest
from datetime import date
from pathlib import Path

from PIL import Image

from ingestion.pipeline import age_on, licence_status, mapped_position, normalise_text, parse_source_date, render_editorial, render_editorial_cutout, slugify, validate_men_only


class PipelineUnitTests(unittest.TestCase):
    def test_source_date_supports_dataset_format(self):
        self.assertEqual(parse_source_date("20-12-1998"), date(1998, 12, 20))

    def test_age_uses_snapshot_not_current_date(self):
        self.assertEqual(age_on(date(1998, 12, 20), date(2026, 9, 12)), 27)

    def test_search_normalisation_handles_accents(self):
        self.assertEqual(normalise_text("Kylian Mbappé"), "kylian mbappe")
        self.assertEqual(slugify("Aitana Bonmatí"), "aitana-bonmati")

    def test_positions_are_normalised_for_gameplay(self):
        self.assertEqual(mapped_position("CB"), "Defender")
        self.assertEqual(mapped_position("CAM"), "Midfielder")
        self.assertEqual(mapped_position("ST"), "Forward")

    def test_conservative_licence_policy(self):
        self.assertEqual(licence_status("CC BY 4.0", "pending"), "approved")
        self.assertEqual(licence_status("CC BY-SA 4.0", "pending"), "review_required")
        self.assertEqual(licence_status("CC BY-SA 4.0", "approved"), "approved")
        self.assertEqual(licence_status("All rights reserved", "approved"), "rejected")

    def test_editorial_converter_preserves_standard_dimensions(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "source.png"
            output = Path(temporary) / "editorial.webp"
            Image.new("RGB", (400, 500), "#d8cdb9").save(source)
            render_editorial(source, output)
            with Image.open(output) as converted:
                self.assertEqual(converted.size, (400, 500))
                self.assertEqual(converted.format, "WEBP")

    def test_temporary_pool_rejects_non_men_source_rows(self):
        rows = {"1": {"gender": "Women's Football"}}
        selected = {"1": {"display_name": "Example Player"}}
        with self.assertRaisesRegex(ValueError, "men-only"):
            validate_men_only(rows, selected)

    def test_editorial_cutout_preserves_alpha(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "cutout.png"
            output = Path(temporary) / "cutout-editorial.webp"
            image = Image.new("RGBA", (200, 300), (20, 40, 60, 0))
            image.paste((120, 80, 60, 255), (30, 20, 170, 300))
            image.save(source)
            render_editorial_cutout(source, output)
            with Image.open(output) as converted:
                self.assertEqual(converted.size, (400, 500))
                self.assertEqual(converted.mode, "RGBA")
                self.assertEqual(converted.getchannel("A").getextrema(), (0, 255))


if __name__ == "__main__":
    unittest.main()
