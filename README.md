# Kanji Interpreter

**Point your phone at Japanese text and learn every kanji in it: how to say it, what it means, and how it is
built. Free, open source, no API keys.**

**Try it:** https://kanji-intepreter.onrender.com (works in a phone browser, nothing to install. The free server
sleeps when unused, so the first scan of the day can take about a minute.)

## Why this exists

As a student learning Japanese, you meet kanji everywhere: on product labels, signs, menus, textbook pages.
Translation apps tell you what a sentence *means*, but they don't teach you the characters: how each one is read,
what it means on its own, and why a word is pronounced the way it is.

Apps that do this well usually call a paid AI API (OpenAI, Google Gemini and so on) for every photo. That needs an
API key, costs money per scan, and sends your photos to a large company. A school project or a student can't
keep that running for free.

**The goal of this project: a kanji learning tool that costs nothing to run or to use.** Every part is free
and open: open-source models, open dictionaries, free hosting (a Hugging Face Space for the backend, Render for
the website). There are no API keys, no accounts and no per-scan fees.

## What you can do with it

1. **Scan.** Take a photo or upload one. Like the iPhone Notes scanner, a yellow box finds the page or the text
   you are aiming at; a tilted page is cut out and straightened. You can adjust the box, down to a single kanji.
2. **Get a card for every word.** Each kanji word found in the photo gets a card with:
   - hiragana, katakana and romaji;
   - the English meaning;
   - on'yomi and kun'yomi;
   - an approximate JLPT level;
   - the sentence it was found in.

   You can search the cards, or tap a kanji to see every word that uses it (先 in 先週, 先生, 先に).
3. **Open a word to study each kanji.** Tapping a card opens a page with one card per kanji, showing:
   - its own meaning, stroke count and level;
   - all its readings with romaji;
   - **the reading used in this word, highlighted** (in 先週 *senshuu*, 先 is read セン *sen*, not さき
     *saki*).
4. **Hear the pronunciation.** 🔊 buttons read the word and each reading aloud in Japanese. They use the
   phone's own built-in voice (the browser's Web Speech API), so pronunciation costs nothing and needs no
   server. If you hear no sound, add a Japanese voice in your phone's text-to-speech settings.

## How it stays free

| Part | What does it | Runs on | Cost |
|---|---|---|---|
| Find the page / text while you aim | [scanic](https://www.npmjs.com/package/scanic) page detector + meikiocr's small text detector | your phone (downloaded once, about 20 MB, then kept) | $0 |
| Read the text (OCR) | [meikiocr](https://github.com/rtr46/meikiocr): small open models, CPU only | free Hugging Face Space | $0 |
| Split into words, readings | SudachiPy, pykakasi | same Space | $0 |
| Meanings, per-kanji readings | JMdict + KANJIDIC2 (offline dictionaries) | same Space | $0 |
| Pronunciation | the phone's built-in Japanese voice | your phone | $0 |
| The website | static files | free Render static site | $0 |

Your photos only go to this project's own backend, never to Google or OpenAI.

The trade-off: small free models are not as clever as a large paid AI (see Limits below), and the free server
falls asleep when nobody uses it.

## Limits (what to expect)

- **Handwriting** and **decorative fonts** (heavy brush calligraphy, manga lettering, logos) are often misread.
  Printed text works well.
- **No context correction.** Each character is read on its own. A large AI would fix 先土 to 先生 from context;
  this app can't.
- **Furigana** (small readings next to kanji) can end up as separate text.
- **Old / Traditional Chinese forms** (戰, 獸, 兒) are rarer in Japanese and sometimes misread; their modern
  Japanese forms (戦, 獣, 児) read fine. On a chart of 32 traditional characters: 26 exact, 28 counting the
  Japanese forms.
- **Curved objects** (bottles, cans): the scanner straightens flat pages only.
- **Readings and meanings** are real dictionary entries, but a word with several readings can get the wrong one.
  The highlighted "reading used in this word" is skipped when a sound change makes it unclear (学校 is がっこう,
  not がく + こう). The JLPT level is approximate.
- **Pronunciation quality** depends on the phone's voice.

## How it works

```
Phone browser (React + Vite + Tailwind)
  Camera / upload -> scanner (on the phone): find page or text, straighten, crop
        |  POST /analyze (the cropped photo)
        v
Backend on a Hugging Face Space (FastAPI, backend/main.py)
  1. meikiocr   : image -> lines of Japanese text (horizontal, vertical, rotated photos)
  2. SudachiPy  : text -> words, with reading and dictionary form (今日 = きょう, 食べた -> 食べる)
  3. pykakasi   : reading -> romaji
  4. jamdict    : JMdict (word meaning) + KANJIDIC2 (each kanji: meaning, on/kun, level)
  -> {"text": "...", "cards": [KanjiCard, ...]}   each card includes "chars": one entry per kanji
        |
        v
Phone: word cards -> tap -> page per kanji -> 🔊 phone's voice
```

The scanner, why it's built from existing models, and how it was measured: [docs/SCANNER.md](docs/SCANNER.md).
`KanjiCard` and the per-kanji `CharInfo` are defined in `src/types/kanji.ts`.

## Run it yourself

```bash
# backend (Python 3.10+)
cd backend
python -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000              # first run downloads the OCR models (needs internet once)

# frontend (new terminal, project root)
npm install
npm run dev          # http://localhost:5173 (camera works on localhost)
npm run dev:phone    # https on your Wi-Fi, to test on a phone (see below)
```

- **Model cache:** OCR models are cached in `backend/.cache/huggingface`. To keep pip's cache off C:, set
  `PIP_CACHE_DIR=D:\pip-cache`.
- **Windows: `pip install jamdict-data` fails** (WinError 32). Download `jamdict_data-1.5.tar.gz` from PyPI and
  extract it. Unpack `jamdict_data/jamdict.db.xz` to `jamdict_data/jamdict.db` (Python's `lzma`), delete the
  `.xz`, then run `pip install .` in that folder. Set `PYTHONUTF8=1` when printing Japanese to the console.
- **Windows shortcut:** once the backend venv exists, double-click `start.bat` (starts both, phone mode).
- **Testing on a phone (same Wi-Fi):**
  1. Run `npm run dev:phone`; it prints `https://192.168.x.x:5173`.
  2. Open that on the phone and accept the certificate warning once. The camera needs HTTPS.
  3. If the phone can't connect, allow Node.js through Windows Firewall (private networks).

## Deploy your own copy (free)

| Part | Free host | Notes |
|---|---|---|
| Backend | **Hugging Face Space**, SDK = Gradio, free hardware | It needs about 1 GB of RAM. `deploy_space.py` uploads `app.py`, `main.py` and `requirements-space.txt`. To update only the code, upload `main.py` in the Space's Files tab. |
| Frontend | **Render static site** (`render.yaml`) | Build `npm ci && npm run build`, publish `dist`, set `VITE_API_URL=https://<user>-<space>.hf.space`. It redeploys on every push. |

1. **Backend:** run `hf auth login` (a *write* token, pasted in your own terminal). Then run
   `venv\Scripts\python deploy_space.py [space-name]` from `backend/`. When the build finishes,
   `https://<user>-<space-name>.hf.space` shows a test page.
2. **Frontend:** in Render, go to New → Blueprint and pick this repo. Set `VITE_API_URL` to the Space URL.

Render's free *web service* is too small for the backend: 512 MB of RAM and a tenth of a CPU. Docker Spaces are
now paid; the `Dockerfile` is kept for other hosts (untested).

## What was tested

All test photos are computer-generated (real text and pages placed on real photos). Real phone photos vary more.

| Test | Result |
|---|---|
| Signs, sentences, menus (gothic + mincho, clean and phone-like) | all correct |
| Vertical text (book pages, sentences, small kana) | 168 / 168 kanji words |
| Photos turned 90 / 180 / 270° | same words as upright (72 / 72) |
| Textbook pages with pen, pencil and highlighter marks | 0 / 204 words missed, 0 fake cards |
| Fake kanji on photos without Japanese (textures, English signs) | fake cards cut from 35 to 5 |
| Finding a tilted page in a cluttered photo (48 photos) | 46 / 48 with scanic (our own first try: 0 / 48) |
| Words read from those 48 photos, raw vs. scanned | 371 → 1022 of 1200 |
| Single kanji in a tight box (80 crops) | 71 / 80 right |
| Live text box, small vs. big model (157 lines) | same text found, 5× faster |

Details and comparisons: [docs/SCANNER.md](docs/SCANNER.md).

## Roadmap

- **Handwriting (future interest):** recognize handwritten kanji, for example notes or practice sheets. This
  needs an extra model next to the current OCR, which means more memory on the free server and a slower scan,
  so it is left out for now to keep the app free and fast.
- **Curved objects:** add UVDoc (an open model that flattens bent pages and labels) on the backend.
- **JLPT levels:** use an open N5–N1 word list instead of KANJIDIC2's old 4-level scale.
- **Old character forms:** also show the modern form's card (戰 → 戦).
- **Study features:** save cards to a deck, export to Anki, furigana toggle.
- Romaji with macrons (tōkyō) as an option.
- Names: use JMnedict for people and place names.

## Credits and licenses

- **OCR:** [meikiocr](https://github.com/rtr46/meikiocr) (code Apache-2.0) and its models
  `meiki.text.detect` / `meiki.txt.recognition` (LGPL-3.0) by rtr46.
- **Page scanner:** [scanic](https://www.npmjs.com/package/scanic) (MIT).
- **Language tools:** SudachiPy + SudachiDict (Apache-2.0), pykakasi (GPL-3.0), jamdict (MIT).
- **Dictionaries:** [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) and
  [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project). Both are © the Electronic Dictionary
  Research and Development Group, used under the
  [EDRDG licence](https://www.edrdg.org/edrdg/licence.html).
- **Runtime and frameworks:** onnxruntime-web (MIT), FastAPI, Gradio, React.
