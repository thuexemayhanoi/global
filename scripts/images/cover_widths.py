#!/usr/bin/env python3
"""Add an intermediate-width variant to reviewed covers (Matrix task IMG-SRCSET).

The cover srcset offered only 640w and 1200w, so a 760 px desktop slot and most phones at DPR 2 downloaded the
1200 px file. This writes <name>-800.webp next to each listed cover: the reviewed 1200x675 WebP downsized to
800x450 with Lanczos at WebP quality 82 (the setting of the 640 px variant). The picture is the same cover; nothing
is redrawn. It records src800 and bytes800 in data/seo/image-covers.json, which scripts/articles.mjs adds to srcset.

Usage: python3 scripts/images/cover_widths.py --batch=IMG-01   (the URLs of image batch IMG-01, at most 100)
       python3 scripts/images/cover_widths.py --ids=DE-CHECKLIST,VI-H01
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MANIFEST = os.path.join(ROOT, "data", "seo", "image-covers.json")
WIDTH, HEIGHT, QUALITY = 800, 450, 82


def ids_from_args(argv):
    batch = next((a.split("=", 1)[1] for a in argv if a.startswith("--batch=")), "")
    ids = next((a.split("=", 1)[1] for a in argv if a.startswith("--ids=")), "")
    if batch:
        board = json.load(open(os.path.join(ROOT, "docs", "seo-matrix", "TASKS.json"), encoding="utf-8"))
        task = next((t for t in board["tasks"] if t["id"] == batch), None)
        if not task or not isinstance(task.get("scope"), list):
            raise SystemExit(f"No image batch {batch} with a scope list")
        return task["scope"]
    if ids:
        return [i for i in ids.split(",") if i]
    raise SystemExit(__doc__)


def main(argv):
    ids = ids_from_args(argv)
    if len(ids) > 100:
        raise SystemExit(f"{len(ids)} images: at most 100 per batch")
    manifest = json.load(open(MANIFEST, encoding="utf-8"))
    covers = manifest["covers"]
    done = {}
    for mid in ids:
        c = covers.get(mid)
        if not c:
            raise SystemExit(f"{mid}: no reviewed cover in the manifest")
        src = os.path.join(ROOT, c["src"].lstrip("/"))
        img = Image.open(src).convert("RGB")
        if img.size != (1200, 675):
            raise SystemExit(f"{mid}: {img.size}, expected 1200x675")
        rel = c["src"][:-len(".webp")] + "-800.webp"
        img.resize((WIDTH, HEIGHT), Image.LANCZOS).save(os.path.join(ROOT, rel.lstrip("/")), "WEBP", quality=QUALITY, method=6)
        c["src800"] = rel
        c["bytes800"] = os.path.getsize(os.path.join(ROOT, rel.lstrip("/")))
        done[mid] = c["bytes800"]
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(json.dumps({"images": len(done), "bytes800_min": min(done.values()), "bytes800_max": max(done.values())}))


if __name__ == "__main__":
    main(sys.argv[1:])
