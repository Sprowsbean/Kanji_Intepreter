"""Dump the app's current OCR (meikiocr + our pre/post-processing) on every test image.
Run from backend/ with the app venv: python experiments/run_meiki.py <test_images dir> <out.json>"""
import json
import os
import sys
import time

import cv2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import main  # noqa: E402

test_dir, out = sys.argv[1], sys.argv[2]
gt = json.load(open(os.path.join(test_dir, "gt_all.json"), encoding="utf-8"))
dump = {}
for img in gt:
    t = time.time()
    lines = main.ocr_lines(cv2.imread(os.path.join(test_dir, img)))
    dump[img] = {"lines": lines, "secs": time.time() - t}
json.dump(dump, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(len(dump), "images")
