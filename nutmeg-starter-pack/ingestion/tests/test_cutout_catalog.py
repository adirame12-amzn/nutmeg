import tempfile
import unittest
from pathlib import Path

from PIL import Image

from ingestion.cutout_catalog import add_cutout_metadata, cutout_urls, keep_primary_subject


class CutoutCatalogTests(unittest.TestCase):
    def test_builds_rating_scoped_asset_urls(self):
        player = {"id": "example-player", "fcOverall": 87}
        self.assertEqual(cutout_urls(player), (
            "/nutmeg/players/rating-87/cutouts/example-player.png",
            "/nutmeg/players/rating-87/cutouts-editorial/example-player.webp",
        ))

    def test_marks_automated_output_for_visual_review(self):
        player = {"id": "example-player", "fcOverall": 87, "displayName": "Example Player"}
        updated = add_cutout_metadata(player)
        self.assertEqual(updated["portraitCutoutStatus"], "auto_review_pending")
        self.assertEqual(player, {"id": "example-player", "fcOverall": 87, "displayName": "Example Player"})

    def test_removes_disconnected_mask_islands(self):
        with tempfile.TemporaryDirectory() as temporary:
            image = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
            image.paste((20, 30, 40, 255), (10, 5, 35, 40))
            image.paste((20, 30, 40, 255), (1, 1, 4, 4))
            cleaned = keep_primary_subject(image)
            output = Path(temporary) / "cleaned.png"
            cleaned.save(output)
            self.assertEqual(cleaned.getpixel((2, 2))[3], 0)
            self.assertEqual(cleaned.getpixel((20, 20))[3], 255)


if __name__ == "__main__":
    unittest.main()
