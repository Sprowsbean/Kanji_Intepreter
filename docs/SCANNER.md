# How the scanner works, and why it is built this way

Goal: scan like the iPhone Notes scanner, for any kind of object. You point the camera at the text, a box
covers the area of interest by itself, you can adjust it, and the app sends a cropped, straightened image to
the OCR.

## The flow

1. **Camera.** About 4 times a second, the app looks for a **page or document**. When it finds one, it
   draws a yellow outline around the page. When there's no page (a product, a screen, a sign), it looks
   for **text near the center** about once a second and draws a yellow box around it.
2. **After the photo.** If a page was found, it is shown **cut out and straightened**, like the iPhone's
   "zoom in and transform". Otherwise you get the box around the text. Either way you can **adjust the
   box**: drag a corner to resize it, or drag inside it to move it. It stays a rectangle.
3. **Scan.** Only that straightened page, or the inside of the box, is sent to the OCR. Large images are
   scaled down to 2400 px first.

## What it is built from (existing models, nothing hand-tuned)

| Step | What does it | Why this one |
|---|---|---|
| Find a page | [scanic](https://www.npmjs.com/package/scanic) ML detector (DocCornerNet, MIT): a neural network that predicts the 4 page corners | Small (about 1.9 MB model + 1.5 MB runtime), fast (about 25 ms per frame in a browser), runs on the phone, made for exactly this |
| Straighten the page | scanic `extractDocument` (perspective correction) | Comes with it, tested |
| Find text on non-documents | The OCR's own text detector (meikiocr, Apache-2.0), run in the browser with onnxruntime-web | The same model that reads the text afterwards, so the box shows what the OCR will see. Gives the same boxes as the backend (checked: 35/35 boxes identical) |
| Read the text | meikiocr + the existing fixes (vertical text, rotation, fake-kanji filters) on the backend | Beat PaddleOCR/RapidOCR earlier (749/758 words vs 741/740, 7× fewer fake cards, 8× faster) |

## Why this is the best option we found (measured, not guessed)

**Finding the page**, on 48 hard document photos (tilted up to 35°, cluttered photo backgrounds, wood,
a table almost as light as the paper, shadows, a finger over an edge) and 34 images without any page.
Every detector ran as it comes (scanic with its default settings):

| Detector | Pages found | False finds | Size |
|---|---|---|---|
| Our first hand-made detector (was live) | 0 / 48 | 3 / 34 | — |
| Our second hand-made detector (line based) | 37 / 48 | 1 / 34 | — |
| Classic OpenCV scanner method (what jscanify uses) | 28 / 48 | 2 / 34 | ~8 MB |
| **scanic ML** | **46 / 48** | 4 / 34 | **~3.4 MB** |

**Does it help the OCR?** Measured end to end against the live backend. The same photos went in once as
they are and once through the app's scan step:

| | Raw photo | App scan (find + straighten / crop) |
|---|---|---|
| 48 document photos | 371 / 1200 words (31%), 59 fake | **1022 / 1200 words (85%), 33 fake** |
| Screenshot, product label, marked textbook page | all words | all words |
| JLPT table screenshot | 8 / 8 | 6 / 8 (the table is taken as the "page", so the header is left out; adjust the box to include it) |

## What we tried and dropped

- **Our own page detectors.** Hand-made rules tuned on our own test images don't generalize, so we switched to a trained model.
- **"Make it whiter" cleanup** (standard scanner-app shadow removal). Measured on 200 images, it made the
  OCR slightly **worse** (1121 → 1114 words; 1089 with extra contrast), so it is not used. The OCR model was
  trained on colorful game text and doesn't need a white page. Whitening helps human eyes, not this model.
  We found no lightweight ML model for it: [DocRes](https://github.com/ZZZHANG-jx/DocRes) does it but is a
  large research model.
- **PaddleOCR / RapidOCR** as the reader (see `backend/experiments/RESULTS.md` on the `experiment/paddleocr` branch).

## Limits and next steps

- **Curved objects** (bottles, cans, bent pages): straightening assumes a flat page. The existing model for
  curves is **UVDoc** (PaddlePaddle, about 30 MB ONNX, about 1 s on a CPU). It would run on the backend, as a next step.
- **Text box speed.** The text detector is heavier (14.5 MB model + 11 MB engine, downloaded once and then
  cached; about 0.4 s per frame on a PC, slower on phones). It only runs when no page is found.
- **Strongly rotated text** (about 35° and more) is hard for the text detector. A page around it is still
  found and straightened, which fixes the rotation.
- The test photos are generated (pages composited onto real photos). Real phone photos are the next test set.
