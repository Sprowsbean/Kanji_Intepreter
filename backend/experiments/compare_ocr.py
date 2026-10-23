"""Score OCR engines on the same test images.

Each engine writes a dump {image: {"lines": [...], "secs": float}} (see run_meiki.py / run_paddle.py).
Every dump's lines go through the same word splitting (Sudachi) as the app, then per test group:
  found  = expected kanji words that appear in the output
  fake   = output words with a kanji that is not in the image (a fake card)
Usage: python compare_ocr.py <test_images dir> <dump.json> [<dump.json> ...]
"""
import json
import os
import re
import sys
from collections import defaultdict

from sudachipy import dictionary, tokenizer as sudachi_tok

KANJI = re.compile(r"[一-鿿々]")
tok = dictionary.Dictionary().tokenizer()
MODE = sudachi_tok.Tokenizer.SplitMode.C


def words(lines):
    out = []
    for line in lines:
        for m in tok.tokenize(line, MODE):
            w = m.surface()
            if KANJI.search(w) and w not in out:
                out.append(w)
    return out


def score(gt, dump):
    groups = defaultdict(lambda: {"images": 0, "expected": 0, "found": 0, "fake": 0, "secs": 0.0})
    misses = []
    for img, text in gt.items():
        g = groups[img.split("/")[0] if "/" in img else "main"]
        res = dump.get(img)
        if res is None:
            continue
        got = words(res["lines"])
        exp = words(text.splitlines())
        # lenient match: an engine may split a line differently (東京駅 vs 東京 + 駅)
        found = [w for w in exp if any(w in o or o in w for o in got)]
        fake = [w for w in got if any(KANJI.match(c) and c not in text for c in w)]
        g["images"] += 1
        g["expected"] += len(exp)
        g["found"] += len(found)
        g["fake"] += len(fake)
        g["secs"] += res["secs"]
        if len(found) < len(exp) or fake:
            misses.append((img, [w for w in exp if w not in found], fake))
    return groups, misses


def main():
    test_dir, dumps = sys.argv[1], sys.argv[2:]
    gt = json.load(open(os.path.join(test_dir, "gt_all.json"), encoding="utf-8"))
    results = {os.path.splitext(os.path.basename(d))[0]: score(gt, json.load(open(d, encoding="utf-8"))) for d in dumps}
    names = list(results)
    group_names = sorted({g for groups, _ in results.values() for g in groups})
    print(f"{'group':10}" + "".join(f"| {n:^34}" for n in names))
    print(f"{'':10}" + "| found     fake  avg s/img        " * len(names))
    for gname in group_names + ["TOTAL"]:
        row = f"{gname:10}"
        for n in names:
            groups = results[n][0]
            gs = list(groups.values()) if gname == "TOTAL" else [groups[gname]]
            e, f, k = sum(x["expected"] for x in gs), sum(x["found"] for x in gs), sum(x["fake"] for x in gs)
            secs, imgs = sum(x["secs"] for x in gs), sum(x["images"] for x in gs)
            row += f"| {f:4}/{e:<4} {k:5}  {secs / max(imgs, 1):6.2f}         "
        print(row)
    for n in names:
        print(f"\n{n}: images with misses or fake cards")
        for img, missed, fake in results[n][1]:
            print(f"  {img:44} missed {missed} fake {fake}")


if __name__ == "__main__":
    main()
