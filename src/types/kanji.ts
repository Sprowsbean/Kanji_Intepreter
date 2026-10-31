export interface Reading {
  kana: string;
  romaji: string;
  /** this is the reading the word uses (when it could be worked out) */
  used: boolean;
}

/** one kanji of a word, from KANJIDIC2 */
export interface CharInfo {
  char: string;
  meaning: string;
  on: Reading[];
  kun: Reading[];
  level: string;
  strokes: number | null;
}

export interface KanjiCard {
  kanji: string;
  romaji: string;
  readings: string;
  meaning: string;
  context: string;
  level: string;
  /** missing from an older backend */
  hiragana?: string;
  chars?: CharInfo[];
}
