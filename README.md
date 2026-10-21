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

- Backend: Hugging Face Space, SDK = Docker, CPU basic. Upload `backend/` contents except `venv/` (Dockerfile exposes 7860). Dockerfile is untested.
- Frontend: Vercel, set env `VITE_API_URL` to the Space URL (`https://<user>-<space>.hf.space`).
- CORS is currently `*` in `main.py`; restrict to the Vercel domain if desired.

## What was tested vs not

- TESTED: Sudachi + pykakasi + jamdict card generation on sample sentences (東京, 車, 今日, 食べた).
- TESTED (2026-10-21, Windows, Python 3.11, CPU): `/analyze` end to end with meikiocr 0.3.5 on synthetic images
  (signs, sentences, menu; gothic + mincho fonts; "phone-like" versions with perspective, blur, noise, JPEG;
  12MP frames with small text; EXIF-rotated JPEG). Horizontal text: all correct, ~0.6-2s per image.
  Blank / English-only images -> 404, non-image -> 400. `run_ocr` returns `[{"text", "chars", "is_vertical"}]`.
- Weak: vertical (tategaki) text was garbled on a synthetic test image; one misread (出->H) on a 12MP frame.
- TESTED (2026-10-21): frontend typecheck, lint, build; upload flow in desktop Chrome (cards + "no kanji" error).
  Fixed: blank page in dev when an ad blocker blocks lucide-react's `icons/fingerprint.js`; camera never
  stopped (stale `stream` in cleanup); camera now asks for 1080p instead of the 640x480 default.
- NOT TESTED: real phone photos / phone camera, the Dockerfile (Docker Desktop on the dev PC had corrupted storage).
  Dockerfile now runs as uid 1000 with HF_HOME in the user's home (HF Spaces requirement).

## Known issues / TODO for Claude Code

1. ~~Verify `/analyze` end to end~~ done on synthetic images (see above); fixed: cards now use the dictionary
   form (食べ -> 食べる), JMdict entry is chosen by reading (降る = furu "to fall", not くだる), compounds missing
   from JMdict are explained from sub-words (東京駅 = 東京 (Tokyo) + 駅 (station)). Still to do: try real phone photos.
2. `level` is approximate: KANJIDIC2 only has the old 4-level JLPT scale, mapped to ranges like "N5-N4". Better: add an open JLPT word list (N5-N1) and look up by word.
3. Romaji uses Hepburn without macrons (`toukyou`). Optionally convert to `tōkyō`.
4. Phone photos are the weak point of meikiocr (trained on game text). If it fails, add PaddleOCR (PP-OCRv5 Japanese) as a fallback and pick the result with higher confidence. Resize images client-side (~1280px) before upload.
5. Frontend polish ideas: draw boxes over detected text, tap a word to open its card, furigana toggle, save cards to a deck / export to Anki.
6. ~~Rename `gemini.ts` to `api.ts`, remove `@google/generative-ai`~~ done (also removed unused `@supabase/supabase-js`).
7. Rare words and names: jamdict-data may include JMnedict; `make_card` currently uses only entries, not `result.names`.

## Stack / licenses

meikiocr (Apache-2.0), SudachiPy + SudachiDict (Apache-2.0), pykakasi (GPL-3.0), jamdict (MIT) with JMdict/KANJIDIC2 data (EDRDG licence, attribute them in the UI/README), FastAPI.
