#!/usr/bin/env python3
"""Encode rendered cover PNGs as WebP (called by scripts/images/covers.mjs).

Input: a JSON list of {id, png, out, out640}. Writes the 1200 px WebP at quality 84 (lowered step by step only if
the file would exceed 300 KB, never raised to pad a small file) and a 640 px variant for small screens.
Prints {id: {bytes, bytes640, quality}} as JSON.
"""
import json
import os
import sys

from PIL import Image

MAX = 300 * 1024


def main(jobs_path):
    out = {}
    for job in json.load(open(jobs_path, encoding="utf-8")):
        img = Image.open(job["png"]).convert("RGB")
        if img.size != (1200, 675):
            raise SystemExit(f"{job['id']}: rendered size {img.size}, expected 1200x675")
        os.makedirs(os.path.dirname(job["out"]), exist_ok=True)
        q = 84
        while True:
            img.save(job["out"], "WEBP", quality=q, method=6)
            if os.path.getsize(job["out"]) <= MAX or q <= 60:
                break
            q -= 4
        small = img.resize((640, 360), Image.LANCZOS)
        small.save(job["out640"], "WEBP", quality=82, method=6)
        out[job["id"]] = {"bytes": os.path.getsize(job["out"]), "bytes640": os.path.getsize(job["out640"]), "quality": q}
    print(json.dumps(out))


if __name__ == "__main__":
    main(sys.argv[1])
