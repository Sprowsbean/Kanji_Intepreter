"""Dump RapidOCR (PaddleOCR's PP-OCR models on onnxruntime) on every test image, same format as run_meiki.py.
Run with the experiment venv:  venv-paddle\\Scripts\\python experiments/run_rapid.py <test_images dir> <out.json> <size>
size: tiny | small | medium (PP-OCRv6, Japanese recognizer; models download into the rapidocr package dir).
Writes the dump after every image, so a run that is stopped halfway still leaves usable results."""
import json
import os
import sys
import time

from rapidocr import LangRec, ModelType, OCRVersion, RapidOCR

test_dir, out, size = sys.argv[1], sys.argv[2], sys.argv[3]
engine = RapidOCR(params={
    "Det.ocr_version": OCRVersion.PPOCRV6, "Det.model_type": ModelType(size),
    "Rec.ocr_version": OCRVersion.PPOCRV6, "Rec.model_type": ModelType(size), "Rec.lang_type": LangRec.JAPAN,
    "Global.use_cls": True,  # flips single upside-down lines (no 90-degree page rotation, unlike our pipeline)
    "Global.log_level": "error",
})
gt = json.load(open(os.path.join(test_dir, "gt_all.json"), encoding="utf-8"))
dump = json.load(open(out, encoding="utf-8")) if os.path.exists(out) else {}  # resume
for i, img in enumerate(gt):
    if img in dump:
        continue
    t = time.time()
    res = engine(os.path.join(test_dir, img))
    dump[img] = {"lines": [t_ for t_ in (res.txts or []) if t_.strip()], "secs": time.time() - t}
    json.dump(dump, open(out, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{i + 1}/{len(gt)} {img} {dump[img]['secs']:.1f}s {dump[img]['lines'][:3]}", flush=True)
print("done", len(dump), "images")
