from __future__ import annotations

import argparse
import json
import math
from collections import deque
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

from .pipeline import render_editorial_cutout
from .rating_catalog import ROOT, write_database

PUBLIC_ROOT = ROOT / "public"
GENERATED_ROOT = ROOT / "data/generated"
DEFAULT_MODEL = "u2net_human_seg"


def public_path(url: str) -> Path:
    """Resolve a browser asset URL without baking the GitHub Pages base into the filesystem."""
    relative = url.removeprefix("/nutmeg/").removeprefix("/")
    return PUBLIC_ROOT / relative


def cutout_urls(player: dict[str, Any]) -> tuple[str, str]:
    rating = int(player["fcOverall"])
    slug = player["id"]
    root = f"/nutmeg/players/rating-{rating}"
    return f"{root}/cutouts/{slug}.png", f"{root}/cutouts-editorial/{slug}.webp"


def add_cutout_metadata(player: dict[str, Any], status: str = "auto_review_pending") -> dict[str, Any]:
    cutout_url, editorial_url = cutout_urls(player)
    return {
        **player,
        "portraitCutoutUrl": cutout_url,
        "portraitCutoutEditorialUrl": editorial_url,
        "portraitCutoutStatus": status,
    }


def quality_metrics(path: Path) -> dict[str, float | int | bool]:
    with Image.open(path) as source:
        rgba = source.convert("RGBA")
        alpha = rgba.getchannel("A")
        histogram = alpha.histogram()
        total = rgba.width * rgba.height
        visible = total - histogram[0]
        solid = sum(histogram[245:])
        extrema = alpha.getextrema()
        return {
            "width": rgba.width,
            "height": rgba.height,
            "hasTransparency": extrema[0] < 255,
            "hasOpaqueSubject": extrema[1] > 245,
            "visibleCoverage": round(visible / total, 4),
            "solidCoverage": round(solid / total, 4),
        }


def keep_primary_subject(image: Image.Image) -> Image.Image:
    """Drop small disconnected mask islands while retaining soft edges on the main person."""
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    width, height = rgba.size
    values = alpha.load()
    visited = bytearray(width * height)
    largest: list[tuple[int, int]] = []
    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if visited[offset] or values[x, y] <= 8:
                continue
            component: list[tuple[int, int]] = []
            queue = deque([(x, y)])
            visited[offset] = 1
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        neighbor = ny * width + nx
                        if not visited[neighbor] and values[nx, ny] > 8:
                            visited[neighbor] = 1
                            queue.append((nx, ny))
            if len(component) > len(largest):
                largest = component
    keep = set(largest)
    for y in range(height):
        for x in range(width):
            if (x, y) not in keep:
                values[x, y] = 0
    rgba.putalpha(alpha)
    return rgba


def process_portrait(
    source: Path,
    cutout: Path,
    editorial: Path,
    *,
    session: Any,
    force: bool = False,
    alpha_matting: bool = True,
) -> None:
    if force or not cutout.exists():
        from rembg import remove

        with Image.open(source) as image:
            result = remove(
                image.convert("RGB"),
                session=session,
                alpha_matting=alpha_matting,
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
                alpha_matting_erode_size=8,
                post_process_mask=True,
            )
            cutout.parent.mkdir(parents=True, exist_ok=True)
            keep_primary_subject(result).save(cutout, "PNG", optimize=True)
    if force or not editorial.exists():
        render_editorial_cutout(cutout, editorial)


def update_catalogs(players: list[dict[str, Any]], attributions: list[dict[str, Any]]) -> None:
    by_id = {player["id"]: player for player in players}
    ratings = sorted({int(player["fcOverall"]) for player in players})
    for rating in ratings:
        folder = GENERATED_ROOT / f"rating-{rating}"
        rating_players = json.loads((folder / "players.json").read_text())
        updated = [by_id.get(player["id"], player) for player in rating_players]
        (folder / "players.json").write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n")
        rating_attributions = json.loads((folder / "attributions.json").read_text())
        write_database(folder / "players.sqlite", updated, rating_attributions)

    combined = GENERATED_ROOT / "rating-85-plus"
    (combined / "players.json").write_text(json.dumps(players, ensure_ascii=False, indent=2) + "\n")
    write_database(combined / "players.sqlite", players, attributions)

    # The frontend intentionally gives these hand-selected preview records priority.
    # Mirror cutout metadata there so those duplicate IDs use the same new assets.
    preview_path = GENERATED_ROOT / "players.json"
    preview = json.loads(preview_path.read_text())
    preview = [{**player, **{key: by_id[player["id"]][key] for key in (
        "portraitCutoutUrl", "portraitCutoutEditorialUrl", "portraitCutoutStatus"
    )}} if player["id"] in by_id else player for player in preview]
    preview_path.write_text(json.dumps(preview, ensure_ascii=False, indent=2) + "\n")


def write_review_sheet(players: list[dict[str, Any]], output: Path) -> None:
    columns, cell_width, cell_height = 6, 170, 235
    rows = math.ceil(len(players) / columns)
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#eee3cf")
    draw = ImageDraw.Draw(sheet)
    checker = Image.new("RGB", (150, 190), "#f8f0e2")
    checker_draw = ImageDraw.Draw(checker)
    for y in range(0, 190, 16):
        for x in range(0, 150, 16):
            if (x // 16 + y // 16) % 2:
                checker_draw.rectangle((x, y, x + 15, y + 15), fill="#d8d0c2")
    for index, player in enumerate(players):
        x = (index % columns) * cell_width + 10
        y = (index // columns) * cell_height + 6
        sheet.paste(checker, (x, y))
        with Image.open(public_path(player["portraitCutoutEditorialUrl"])) as source:
            portrait = source.convert("RGBA")
            portrait.thumbnail((150, 190), Image.Resampling.LANCZOS)
            sheet.paste(portrait, (x + (150 - portrait.width) // 2, y + 190 - portrait.height), portrait)
        draw.text((x, y + 195), player["displayName"][:24], fill="#1d1d1b")
        draw.text((x, y + 211), f"FC {player['fcOverall']} · {player['position']}", fill="#6d655b")
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=90)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create transparent and editorial cutouts for the playable catalogue")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--no-alpha-matting", action="store_true")
    parser.add_argument("--skip-metadata", action="store_true")
    args = parser.parse_args()

    try:
        from rembg import new_session
    except ImportError as error:
        raise SystemExit('Install the image extra first: pip install "rembg[cpu]>=2.0.69,<3"') from error

    combined = GENERATED_ROOT / "rating-85-plus"
    players = json.loads((combined / "players.json").read_text())
    attributions = json.loads((combined / "attributions.json").read_text())
    selected = players[:args.limit] if args.limit else players
    session = new_session(args.model)
    review: list[dict[str, Any]] = []

    for index, original in enumerate(selected, start=1):
        player = add_cutout_metadata(original)
        source = public_path(player["portraitUrl"])
        cutout = public_path(player["portraitCutoutUrl"])
        editorial = public_path(player["portraitCutoutEditorialUrl"])
        if not source.exists() or player.get("portraitStatus") == "fallback":
            review.append({"id": player["id"], "status": "unavailable", "reason": "approved source portrait missing"})
            continue
        print(f"[{index}/{len(selected)}] {player['displayName']}", flush=True)
        process_portrait(
            source, cutout, editorial, session=session, force=args.force,
            alpha_matting=not args.no_alpha_matting,
        )
        metrics = quality_metrics(cutout)
        passed = bool(metrics["hasTransparency"] and metrics["hasOpaqueSubject"] and 0.05 < metrics["visibleCoverage"] < 0.9)
        review.append({"id": player["id"], "displayName": player["displayName"], "status": "auto_review_pending" if passed else "manual_review_required", **metrics})

    completed_ids = {item["id"] for item in review if item["status"] == "auto_review_pending"}
    updated_players = [add_cutout_metadata(player) if player["id"] in completed_ids or public_path(cutout_urls(player)[0]).exists() else player for player in players]
    if not args.skip_metadata and not args.limit:
        update_catalogs(updated_players, attributions)
        write_review_sheet(updated_players, combined / "cutouts-contact-sheet.jpg")
    (combined / "cutouts-review.json").write_text(json.dumps(review, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({
        "processed": len(completed_ids),
        "manualReviewRequired": sum(item["status"] == "manual_review_required" for item in review),
        "reviewReport": str(combined / "cutouts-review.json"),
    }, indent=2))


if __name__ == "__main__":
    main()
