# OCR engine comparison (2026-10-23)

Same 156 test images and the same word splitting/scoring for every engine (`compare_ocr.py`). The laptop is
an i7-12650H, CPU only, run overnight.

| Group (images) | meikiocr + our processing (the app) | RapidOCR PP-OCRv6 small | RapidOCR PP-OCRv6 medium |
|---|---|---|---|
| Signs, sentences, menus, tables (21) | **107/107**, 0 fake | 105/107, 1 fake | 101/107, 0 fake |
| Vertical text (24) | **168/168**, 1 fake | **168/168**, 1 fake | **168/168**, 3 fake |
| Photos/textures/English, fake-kanji set (69) | 84/87, 4 fake | **87/87**, 3 fake | 85/87, **2 fake** |
| Textbook pages with pen/pencil marks (18) | **204/204, 0 fake** | 204/204, 6 fake | 204/204, 23 fake |
| Rotated 90/180/270 (24) | **186/192**, 2 fake | 177/192, 3 fake | 182/192, 2 fake |
| **Total** | **749/758 found, 7 fake** | 741/758, 14 fake | 740/758, 30 fake |
| **Average time per image** | **1.2 s** | 10.2 s | 122 s |

## Verdict

**Keep meikiocr.** With our pre/post-processing it finds the most words, makes the fewest fake cards and is
8x faster than the small PP-OCRv6 (100x faster than medium). That speed matters on a free CPU host.

What RapidOCR does better:

- It reads text on very dense patterns (危険 / 立入禁止 on a seigaiha background), which meikiocr misses completely.
- It reads vertical text natively and also reads English.

Where RapidOCR is weaker:

- It is a Chinese-first multilingual model: pencil marks and boxes become Chinese characters (图, 叶), and the
  marked textbook pages give 6-23 fake cards.
- It has no 90-degree page rotation (only flips upside-down lines), so it misses more on rotated photos.
- The numbers above are its raw output; our filters (fake kanji, rotation retry) were not applied to it.

## Notes

- PaddleOCR's own engine on Windows: paddlepaddle 3.3.1 crashes on CPU (oneDNN
  `ConvertPirAttribute2RuntimeAttribute`); 3.0.0 runs but takes 140-250 s per image. RapidOCR runs the same
  models on onnxruntime instead.
- PP-OCRv6 *tiny* has no Japanese recognizer.
- Possible follow-up: use RapidOCR small only as a fallback when meikiocr finds no kanji (dense backgrounds).

Reproduce: `run_meiki.py` (app venv) and `run_rapid.py` (experiment venv with `rapidocr onnxruntime`) write dumps;
`compare_ocr.py <test_images> <dump.json>...` prints the table. The test images are generated locally and are not
in the repo.
