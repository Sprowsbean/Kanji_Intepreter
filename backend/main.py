"""Free, local Kanji scanner: meikiocr (OCR) -> pykakasi (kana/romaji) -> jamdict (meaning/JLPT).
No API keys, no tokens. Run: uvicorn main:app --reload --port 8000
"""
import os
import re
from pathlib import Path

# keep the OCR model cache next to the code (not in the user's home on C:); Docker sets HF_HOME itself
os.environ.setdefault("HF_HOME", str(Path(__file__).parent / ".cache" / "huggingface"))

import cv2
import numpy as np
import pykakasi
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from jamdict import Jamdict
from meikiocr import MeikiOCR
from sudachipy import dictionary, tokenizer as sudachi_tok

app = FastAPI(title="Kanji OCR")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ocr = MeikiOCR()          # downloads ONNX models from HuggingFace on first run, then cached
kks = pykakasi.kakasi()
jam = Jamdict()
tok = dictionary.Dictionary().tokenizer()
MODE = sudachi_tok.Tokenizer.SplitMode.C
MODE_SHORT = sudachi_tok.Tokenizer.SplitMode.A  # splits compounds like 東京駅 -> 東京 + 駅


def kata_to_hira(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def romaji(kana: str) -> str:
    return "".join(x["hepburn"] for x in kks.convert(kana))

KANJI = re.compile(r"[一-鿿々]")
KATA = re.compile(r"[ァ-ヶー]")
# kanji the OCR confuses with katakana: 力/カ, 口/ロ, 工/エ, 二/ニ, 夕/タ, 卜/ト, 八/ハ, 一/ー
LOOKALIKE = str.maketrans("力口工二夕卜八一", "カロエニタトハー")
SKIP = set("、・，, 　()（）「」")

DET_THRESHOLD = 0.15  # the default 0.5 misses big standalone kanji (a table or poster of single characters, 一)
BOX_PAD = 0.15       # detector boxes often clip tall kanji (対 read as 文リ); also try a padded box


def fix_lookalikes(line: str) -> str:
    """ゴウ、ガッ、力 -> ゴウ、ガッ、カ: a lookalike kanji whose neighbours are katakana is katakana."""
    chars = list(line)
    for i, ch in enumerate(chars):
        if ch.translate(LOOKALIKE) == ch:
            continue
        left = next((c for c in reversed(chars[:i]) if c not in SKIP), "")
        right = next((c for c in line[i + 1:] if c not in SKIP), "")
        neighbours = [c for c in (left, right) if c]
        # every neighbour must be katakana, so 八 in ラーメン八百円 stays a kanji
        if neighbours and all(KATA.match(c) or c.translate(LOOKALIKE) != c for c in neighbours) \
                and any(KATA.match(c) for c in neighbours):
            chars[i] = ch.translate(LOOKALIKE)
    return "".join(chars)


def _conf(line: dict) -> float:
    cs = [c["conf"] for c in line["chars"]]
    return sum(cs) / len(cs) if cs else 0.0


def _ocr_boxes(img, boxes):
    # meikiocr has no "recognize these boxes" call, so feed run_ocr our own detections
    ocr.run_detection = lambda image, conf_threshold=0.5: [dict(b) for b in boxes]
    try:
        return ocr.run_ocr(img)
    finally:
        del ocr.run_detection


def _pick(a: dict, b: dict) -> dict:
    """Tight vs padded reading of one box: the more confident one, but a lone 力 beats a lone カ."""
    ta, tb = a["text"].strip(), b["text"].strip()
    if len(ta) == len(tb) == 1 and ta != tb and ta.translate(LOOKALIKE) == tb.translate(LOOKALIKE):
        return a if KANJI.match(ta) else b
    return a if _conf(a) >= _conf(b) else b


def _split_gaps(line: dict) -> list[str]:
    """The detector joins items in one row (日 ... 天 -> 日天); split where the gap exceeds a character."""
    chars = [c for c in line["chars"] if c["char"].strip()]
    if not chars:
        return []
    if line["is_vertical"]:  # vertical char boxes are not reliable enough to split on
        return ["".join(c["char"] for c in chars)]
    segs = [[chars[0]]]
    for a, b in zip(chars, chars[1:]):
        size = max(a["bbox"][3] - a["bbox"][1], b["bbox"][3] - b["bbox"][1])
        # recognizer char boxes are stretched, so a real gap measures well under a character;
        # punctuation (、) is narrow and leaves a gap that is not a separation
        if a["char"] not in SKIP and b["char"] not in SKIP and b["bbox"][0] - a["bbox"][2] > size * 0.4:
            segs.append([])
        segs[-1].append(b)
    return ["".join(c["char"] for c in s) for s in segs]


def _is_slice(b: dict, boxes: list[dict]) -> bool:
    """A low-threshold box covering only part of a character (top of 議 read as 羊) inside a taller box."""
    x1, y1, x2, y2 = b["bbox"]
    area = max(1, (x2 - x1) * (y2 - y1))
    for o in boxes:
        X1, Y1, X2, Y2 = o["bbox"]
        inter = max(0, min(x2, X2) - max(x1, X1)) * max(0, min(y2, Y2) - max(y1, Y1))
        if o is not b and inter / area > 0.8 and (y2 - y1) < 0.75 * (Y2 - Y1):
            return True
    return False


def ocr_lines(img) -> list[str]:
    h, w = img.shape[:2]
    boxes = ocr.run_detection(img, DET_THRESHOLD)
    boxes = [b for b in boxes if not _is_slice(b, boxes)]
    padded = []
    for b in boxes:
        x1, y1, x2, y2 = b["bbox"]
        p = int(round((y2 - y1) * BOX_PAD))  # pad both ways so a square kanji box stays horizontal
        padded.append({**b, "bbox": [max(0, x1 - p), max(0, y1 - p), min(w, x2 + p), min(h, y2 + p)]})
    # read every box tight and padded, keep whichever the recognizer is more confident about
    best = [_pick(a, b) for a, b in zip(_ocr_boxes(img, boxes), _ocr_boxes(img, padded))]
    texts = [fix_lookalikes(t) for l in best for t in _split_gaps(l)]
    # the lower threshold yields overlapping boxes ("焼き魚定食" inside "焼き魚定食八百円"): keep the longer
    return [t for t in dict.fromkeys(texts) if not any(t != u and t in u for u in texts)]
# KANJIDIC2 uses the old 4-level JLPT scale; map roughly to N-levels
OLD_TO_N = {"4": "N5-N4", "3": "N4-N3", "2": "N3-N2", "1": "N2-N1"}


def kanji_info(word: str):
    """Meaning, on/kun readings, level from KANJIDIC2 (fallback when JMdict has no entry)."""
    meanings, on, kun, levels = [], [], [], []
    for ch in word:
        for c in (x for x in jam.lookup(ch).chars if x.literal == ch):
            # skip numeric glosses like 京 = "10**16"
            meanings += [m for m in c.meanings(english_only=True) if "**" not in m][:2]
            for g in c.rm_groups:
                for r in g.readings:
                    if r.r_type == "ja_on":
                        on.append(r.value)
                    elif r.r_type == "ja_kun":
                        kun.append(r.value)
            if c.jlpt:
                levels.append(c.jlpt)
    # lowest old-number = hardest; pick hardest char in the word
    level = OLD_TO_N.get(min(levels), "?") if levels else "?"
    return meanings, on[:3], kun[:3], level


def glosses(word: str, hira: str = "", n_senses: int = 2) -> str:
    entries = jam.lookup(word).entries
    if not entries:
        return ""
    # 降る is both ふる (to fall) and くだる (to descend): prefer the entry matching the reading
    entry = next((e for e in entries if hira in (k.text for k in e.kana_forms)), entries[0])
    return "; ".join(g.text for s in entry.senses[:n_senses] for g in s.gloss[:2])


def reading(text: str) -> str:
    kana = "".join(m.reading_form() for m in tok.tokenize(text, MODE))
    # Sudachi echoes unknown words back unchanged (e.g. 做); pykakasi knows more single kanji
    if KANJI.search(kana):
        kana = "".join(x["kana"] for x in kks.convert(text))
    return kana


def make_card(surface: str, base: str, line: str) -> dict:
    # show the dictionary form (食べた -> 食べる) so the card is a word you can look up
    word = base if KANJI.search(base) else surface
    kana = reading(word)
    hira = kata_to_hira(kana)
    seg = {"hira": hira, "kana": kana, "hepburn": romaji(kana)}
    meanings, on, kun, level = kanji_info(word)
    meaning = glosses(word, hira) or glosses(surface)
    parts = [m.surface() for m in tok.tokenize(word, MODE_SHORT)]
    if not meaning and len(parts) > 1:
        # compound missing from JMdict (e.g. 東京駅): explain it from its sub-words
        meaning = " + ".join(f"{p} ({glosses(p, n_senses=1) or '?'})" for p in parts)
    elif not meaning:
        meaning = ", ".join(dict.fromkeys(meanings)) or "(no entry)"
    # context = where the word was actually found, not the meaning again
    if line.strip() != surface:
        context = f"Found in: 「{line.strip()}」"
    elif len(word) > 1:
        context = f"Found on its own. Characters: {' + '.join(word)}"
    else:
        context = "Found on its own (e.g. a sign or label)"
    if surface != word:
        context += f" (written as {surface})"
    return {
        "kanji": word,
        "romaji": seg["hepburn"],
        "readings": f"On'yomi: {', '.join(on) or '-'} | Kun'yomi: {', '.join(kun) or '-'} | "
                    f"Hiragana: {seg['hira']} | Katakana: {seg['kana']}",
        "meaning": meaning,
        "context": context,
        "level": level,
    }


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    img = cv2.imdecode(np.frombuffer(await file.read(), np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Not a valid image")
    lines = ocr_lines(img)
    text = "\n".join(lines)
    cards, seen = [], set()
    for line in lines:  # per line, so a word never spans a line break and we know its line
        for m in tok.tokenize(line, MODE):
            w = m.surface()
            if KANJI.search(w):
                card = make_card(w, m.dictionary_form(), line)
                if card["kanji"] not in seen:  # 食べた and 食べる share one card
                    seen.add(card["kanji"])
                    cards.append(card)
    if not cards:
        raise HTTPException(404, "No Kanji found in the image")
    return {"text": text, "cards": cards}
