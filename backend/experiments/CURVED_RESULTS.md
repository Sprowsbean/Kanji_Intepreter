# Experiment: flattening curved surfaces with UVDoc

`main.flatten()` (UVDoc, PaddlePaddle/UVDoc_onnx, Apache-2.0, 32 MB) before the OCR, behind `/analyze?curved=1`.

## Real photos (10 phone photos, 960x1280 as received; not in the repo)

Books, a ramune bottle, a toner bottle (front/back), a facial-foam tube (front/back), a floss bag (front/back).
Kanji words on each label written down by reading the photo (109 in total); a word counts if it is in the OCR text.

| | as is | flattened |
|---|---|---|
| whole photo | 67 / 109 | **85 / 109** |
| crop from the app's text box | 53 / 109 | 61 / 109 |

Gains: ramune bottle 11 -> 17, toner back 7 -> 13, book page 10 -> 14, floss back 4 -> 7. Losses of 1 word on 4 photos.
(The text-box crop reads fewer words than the whole photo because it covers one block only; on the ramune bottle it
found no text near the centre, on the floss front it picked the wrong block.)

## Flat test images (33 synthetic: signs, menus, marked pages, vertical books)

216 / 216 kanji words as is, 203 / 216 flattened: UVDoc zooms the page until text touches the edge, and on
already-flat text that costs words. A small page on a large background gets stretched to fill the frame.

## Time

0.3-0.9 s per photo on a laptop CPU after a one-time ~30 s load.

## Conclusion

Helps on curved labels, hurts slightly on flat text: worth shipping only as an opt-in "curved surface" step.
