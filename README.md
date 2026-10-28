# Kanji Interpreter (open-source, no API)

Point a phone camera (or upload a photo) at Japanese text. The app finds the kanji words and shows, for each one:
**hiragana, katakana, romaji, English meaning, on'yomi/kun'yomi, approximate JLPT level.**

Goal: 100% free and open source. No Gemini/OpenAI/paid API, no tokens. School project, so keep it simple (CPU only, no GPU).

## Architecture

```
Phone/browser (React + Vite + Tailwind)
   CameraCapture.tsx -> File (jpeg)
   src/services/api.ts  (POSTs to the backend; in dev, Vite proxies /analyze -> localhost:8000)
        |  POST /analyze  (multipart "file")
        v
FastAPI backend (backend/main.py)
   1. meikiocr   : image -> lines of Japanese text   (ONNX, CPU, Apache-2.0; models auto-download from HuggingFace on first run)
   2. SudachiPy  : text -> words, with context-aware reading + dictionary form (handles 今日=きょう, 食べた->食べる)
   3. pykakasi   : katakana reading -> Hepburn romaji
   4. jamdict    : JMdict (word meaning) + KANJIDIC2 (per-kanji meaning, on/kun, old JLPT level), offline
   -> {"text": "...", "cards": [KanjiCard, ...]}
```

`KanjiCard` (see `src/types/kanji.ts`): `kanji, romaji, readings, meaning, context, level`.
Only tokens that contain kanji become cards; duplicates are removed.

## Run locally

```bash
# backend (Python 3.10+)
cd backend
python -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000              # first run downloads OCR models (needs internet once)
# OCR models are cached in backend/.cache/huggingface (next to the code, not in your home dir / C:).
# To keep pip's download cache off C: as well: set PIP_CACHE_DIR=D:\pip-cache before `pip install`.
# Windows: `pip install jamdict-data` fails (WinError 32, its setup.py deletes a file it still has open).
# Workaround: download jamdict_data-1.5.tar.gz from PyPI, extract, unpack jamdict_data/jamdict.db.xz to
# jamdict_data/jamdict.db (python lzma), delete the .xz, then `pip install .` in that folder.
# Also set PYTHONUTF8=1 on Windows if printing Japanese to the console.

# frontend (new terminal, project root)
npm install
npm run dev          # http://localhost:5173 (camera works on localhost)
npm run dev:phone    # https on your Wi-Fi, for testing on a phone (see below)
```

Windows shortcut: after the backend venv exists, double-click `start.bat` (starts both, phone mode).

**Testing on a phone (same Wi-Fi):** `npm run dev:phone` prints `Network: https://192.168.x.x:5173`.
Open that on the phone and accept the self-signed certificate warning once (Advanced -> Proceed).
The camera needs HTTPS, which is why this mode exists. Only the frontend port is needed: the Vite server
proxies `/analyze` to the backend on the PC. If the phone can't connect, allow Node.js through Windows Firewall
(private networks).

## Deploy (free)

The backend needs about **1 GB of RAM** once loaded (OCR models + Sudachi + JMdict) and a few seconds of CPU per
photo, so where you host it matters:

| Part | Free host | Why |
|---|---|---|
| Backend | **Hugging Face Space** (SDK = **Gradio**; hardware CPU basic or the free ZeroGPU, which runs on a CPU machine too) | Fits easily. `deploy_space.py` uploads `app.py` (serves the FastAPI backend + a Gradio test page), `main.py` and `requirements-space.txt`. Docker Spaces are now paid; `Dockerfile` is kept for other hosts (untested). |
| Frontend | **Render Static Site**, Vercel or Netlify | It's only static files. Build: `npm install && npm run build`, publish dir: `dist`, env `VITE_API_URL=https://<user>-<space>.hf.space`. |

Steps:
1. Backend: `hf auth login` (a *write* token from huggingface.co/settings/tokens), then from `backend/`:
   `venv\Scripts\python deploy_space.py [space-name]`. It creates (or updates) a public Gradio Space and uploads
   only `app.py`, `main.py` and `requirements-space.txt`. Wait for the build, then open
   `https://<user>-<space-name>.hf.space` (test page) or `/docs` (API) to check it is up.
2. Frontend: Render dashboard -> New -> Blueprint -> this repo (uses `render.yaml`); enter `VITE_API_URL` =
   the Space URL from step 1. Render redeploys on every push to the chosen branch.

- **Not Render's free web service for the backend:** it has 512 MB RAM (the backend needs ~1 GB) and 0.1 CPU
  (a 2-6 s scan would take about a minute).
- A free Space goes to sleep when nobody uses it for a while; the first scan after that waits for it to wake up
  and load the models.
- CORS is currently `*` in `main.py`; restrict it to the frontend's domain if desired.

## Limitations (what to expect from the demo)

This app runs a small, free OCR model (about 44 MB, CPU only), not a large AI model like Gemini or GPT. Printed
Japanese works well; these do not, or not reliably:

- **Handwriting**, including handwritten Japanese notes on a page. Handwritten kanji may be missed, or read as
  real text and turned into cards.
- **Decorative fonts:** heavy brush calligraphy, manga lettering, logos. Simple brush fonts mostly work.
- **Text on very busy patterns.** Text on a dense repeating background may not be found at all.
- **Furigana** (small readings above/beside kanji) is not handled specially and can end up as separate text.
- **No context correction.** Each character is read on its own; a large AI model would fix 先土 to 先生 from
  context, this app cannot.
- **Speed:** a photo takes ~0.5-3 s on a laptop CPU. A photo taken sideways or upside down takes up to 4x longer,
  because the app retries it at each rotation.
- **Readings and meanings** come from dictionaries (JMdict/KANJIDIC2), so they are real dictionary entries, but the
  word chosen for a kanji can be the wrong one when a word has several readings. The JLPT level is approximate.
- Tested mostly on computer-generated test images (see below); real-world photos vary more.

## What was tested vs not

- TESTED: Sudachi + pykakasi + jamdict card generation on sample sentences (東京, 車, 今日, 食べた).
- TESTED (2026-10-21, Windows, Python 3.11, CPU): `/analyze` end to end with meikiocr 0.3.5 on synthetic images
  (signs, sentences, menu; gothic + mincho fonts; "phone-like" versions with perspective, blur, noise, JPEG;
  12MP frames with small text; EXIF-rotated JPEG). Horizontal text: all correct, ~0.6-2s per image.
  Blank / English-only images -> 404, non-image -> 400. `run_ocr` returns `[{"text", "chars", "is_vertical"}]`.
- TESTED (2026-10-22) on locally generated test images (not included in the repo):
  - Screenshots of a JLPT kanji table and a brush-font kanji poster: all kanji found (big standalone kanji,
    katakana/kanji lookalikes like カ/力, items far apart on one row).
  - Vertical text (24 images: book pages, sentences, small kana; 2 fonts; clean + phone-like): 168/168 kanji words
    found. Vertical columns are cut into characters and read as a horizontal line (the vertical model was weak).
  - Rotated photos: every test image turned 90/180/270 degrees gives the same words as upright (72/72).
  - Fake kanji (108 images incl. 20 real photos with no Japanese, textures, English signs): fake cards cut from
    35 to 5 with no real words lost. Textbook pages with pencil/pen marks, highlighter, margin notes (18 images):
    0 fake cards, 0/204 words missed.
- TESTED (2026-10-21): frontend typecheck, lint, build; upload flow in desktop Chrome (cards + "no kanji" error).
  Fixed: blank page in dev when an ad blocker blocks lucide-react's `icons/fingerprint.js`; camera never
  stopped (stale `stream` in cleanup); camera now asks for 1080p instead of the 640x480 default.
- Phone camera: used on a real phone over Wi-Fi (`npm run dev:phone`); photos taken sideways failed, fixed by the
  rotation retry above.
- NOT TESTED: the Dockerfile (Docker Desktop on the dev PC had corrupted storage), hosting on a free Space.
  Dockerfile now runs as uid 1000 with HF_HOME in the user's home (HF Spaces requirement).

## Known issues / TODO for Claude Code

1. ~~Verify `/analyze` end to end~~ done on synthetic images (see above); fixed: cards now use the dictionary
   form (食べ -> 食べる), JMdict entry is chosen by reading (降る = furu "to fall", not くだる), compounds missing
   from JMdict are explained from sub-words (東京駅 = 東京 (Tokyo) + 駅 (station)). Still to do: try real phone photos.
2. `level` is approximate: KANJIDIC2 only has the old 4-level JLPT scale, mapped to ranges like "N5-N4". Better: add an open JLPT word list (N5-N1) and look up by word.
3. Romaji uses Hepburn without macrons (`toukyou`). Optionally convert to `tōkyō`.
4. Better accuracy (handwriting, decorative fonts), if needed: (a) an optional "accurate mode" with a small
   vision-language model (e.g. PaddleOCR-VL ~0.9B or Qwen-VL 2-3B) on a GPU; too slow on a free CPU host;
   (b) an optional Gemini API key on the server, used for OCR only, with the local OCR as fallback (photos then
   go to Google). Resize images client-side (~1280px) before upload to speed up the free host.
5. Frontend polish ideas: draw boxes over detected text, tap a word to open its card, furigana toggle, save cards to a deck / export to Anki.
6. ~~Rename `gemini.ts` to `api.ts`, remove `@google/generative-ai`~~ done (also removed unused `@supabase/supabase-js`).
7. Rare words and names: jamdict-data may include JMnedict; `make_card` currently uses only entries, not `result.names`.

## Stack / licenses

meikiocr (Apache-2.0), SudachiPy + SudachiDict (Apache-2.0), pykakasi (GPL-3.0), jamdict (MIT) with JMdict/KANJIDIC2 data (EDRDG licence, attribute them in the UI/README), FastAPI.
