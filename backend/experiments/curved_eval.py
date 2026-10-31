"""EXPERIMENT: does flattening with UVDoc (main.flatten) help the OCR on curved surfaces, and how much does it
hurt on flat ones?

Usage (from backend/, with the venv):
    python experiments/curved_eval.py <folder> [--out <folder for side-by-side images>]

Every image in <folder> is read twice, as it is and flattened. Put the photo already cropped to the label or
page, the way the app's box would send it (UVDoc expects the page to fill the image). If <folder> has a
words.json ({"photo.jpg": ["保湿", "化粧水", ...]}), the words found are counted; otherwise the kanji cards of
both versions are printed so they can be compared by eye.
"""
import argparse
import json
import sys
import time
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main  # noqa: E402


def read(img) -> tuple[str, list[str]]:
    r = main.analyze_image(img)
    return r["text"].replace("\n", ""), [c["kanji"] for c in r["cards"]]


def main_() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--out")
    a = ap.parse_args()
    folder = Path(a.folder)
    gt_path = folder / "words.json"
    gt = json.loads(gt_path.read_text(encoding="utf-8")) if gt_path.exists() else {}
    out = Path(a.out) if a.out else None
    if out:
        out.mkdir(parents=True, exist_ok=True)
    main.flatten(cv2.imread(str(next(p for p in folder.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}))))  # load once
    tot_raw = tot_flat = tot_n = 0
    times = []
    for p in sorted(folder.iterdir()):
        if p.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        img = cv2.imread(str(p))
        t = time.perf_counter()
        flat = main.flatten(img)
        times.append(time.perf_counter() - t)
        (raw_text, raw_cards), (flat_text, flat_cards) = read(img), read(flat)
        if out:
            cv2.imwrite(str(out / p.name), cv2.hconcat([img, flat]))
        words = gt.get(p.name)
        if words:
            r = sum(w in raw_text for w in words)
            f = sum(w in flat_text for w in words)
            tot_raw, tot_flat, tot_n = tot_raw + r, tot_flat + f, tot_n + len(words)
            print(f"{p.name}: as is {r}/{len(words)}, flattened {f}/{len(words)}")
        else:
            print(f"{p.name}\n  as is:     {raw_cards}\n  flattened: {flat_cards}")
    if tot_n:
        print(f"\nTOTAL words: as is {tot_raw}/{tot_n}, flattened {tot_flat}/{tot_n}")
    if times:
        print(f"flatten time: median {sorted(times)[len(times) // 2]:.2f} s")


if __name__ == "__main__":
    main_()
