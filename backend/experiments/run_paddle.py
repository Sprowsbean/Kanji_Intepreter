"""Dump PaddleOCR (PP-OCRv5, Japanese) on every test image, in the same format as run_meiki.py.
Run with its own venv (paddle's packages are kept out of the app venv):
  set PADDLE_PDX_CACHE_HOME=D:\\cache\\paddlex   (models go here instead of ~/.paddlex on C:)
  venv-paddle\\Scripts\\python experiments/run_paddle.py <test_images dir> <out.json> [det model] [rec model]
Windows note: paddlepaddle 3.3.1 crashes on CPU (oneDNN "ConvertPirAttribute2RuntimeAttribute"); 3.0.0 works.
lang="japan" defaults to PP-OCRv6_medium, which is far too slow on CPU without oneDNN."""
import json
import os
import sys
import time

from paddleocr import PaddleOCR

test_dir, out = sys.argv[1], sys.argv[2]
det = sys.argv[3] if len(sys.argv) > 3 else "PP-OCRv5_mobile_det"
rec = sys.argv[4] if len(sys.argv) > 4 else "PP-OCRv5_server_rec"  # PP-OCRv5 rec covers Japanese
ocr = PaddleOCR(
    text_detection_model_name=det,
    text_recognition_model_name=rec,
    use_doc_orientation_classify=True,  # whole image turned 90/180/270 (like our rotation retry)
    use_doc_unwarping=False,
    use_textline_orientation=True,      # single upside-down lines
)
gt = json.load(open(os.path.join(test_dir, "gt_all.json"), encoding="utf-8"))
dump = {}
for i, img in enumerate(gt):
    t = time.time()
    lines = []
    for res in ocr.predict(os.path.join(test_dir, img)):
        lines += [t_ for t_ in res["rec_texts"] if t_.strip()]
    dump[img] = {"lines": lines, "secs": time.time() - t}
    print(f"{i + 1}/{len(gt)} {img} {dump[img]['secs']:.1f}s {lines[:3]}", flush=True)
json.dump(dump, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(len(dump), "images")
