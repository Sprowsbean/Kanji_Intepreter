import { ArrowLeft } from 'lucide-react';
import type { CharInfo, KanjiCard, Reading } from '../types/kanji';
import { SpeakButton } from './SpeakButton';
import { speak } from '../services/speech';

interface KanjiDetailProps {
  card: KanjiCard;
  onBack: () => void;
}

const isKanji = (ch: string) => /[一-鿿々]/.test(ch);
const plain = (kana: string) => kana.replace(/[.-]/g, '');
// on'yomi are written in katakana; the card's main reading shows them in hiragana (セン -> せん)
const hira = (kana: string) => kana.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

function ReadingList({ title, readings }: { title: string; readings: Reading[] }) {
  if (!readings.length) return null;
  return (
    <div>
      <p className="text-xs text-matcha-muted mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {readings.map((r) => (
          <button
            key={r.kana}
            onClick={() => speak(plain(r.kana))}
            className={`inline-flex items-center rounded-full px-3 py-1.5 transition-opacity active:opacity-70 ${
              r.used ? 'bg-matcha-primary text-matcha-onPrimary' : 'bg-matcha-tint border border-matcha-border text-matcha-text'
            }`}
            aria-label={`Say ${plain(r.kana)}`}
            title={r.used ? 'The reading used in this word (tap to hear it)' : 'Tap to hear it'}
          >
            {/* the dot in た.べる marks where the kanji ends and the kana ending starts */}
            <span className="text-sm font-kanji">{r.kana}</span>
            <span className={`ml-1.5 text-xs ${r.used ? 'text-matcha-badge' : 'text-matcha-muted'}`}>{r.romaji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** One kanji on its own: how to say it and what it means. */
function CharCard({ info }: { info: CharInfo }) {
  const used = [...info.on, ...info.kun].find((r) => r.used);
  const main = used ?? info.kun[0] ?? info.on[0];
  return (
    <div className="bg-matcha-card rounded-[20px] p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="font-kanji font-bold text-[68px] leading-none text-matcha-text">{info.char}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-semibold text-matcha-text">{info.meaning || '(no entry)'}</p>
          {main && (
            <button
              onClick={() => speak(plain(main.kana))}
              className="mt-0.5 flex items-center gap-1.5 text-base text-matcha-text active:opacity-70"
              aria-label={`Say ${plain(main.kana)}`}
            >
              <span className="font-kanji">{hira(plain(main.kana))}</span>
              <span className="text-sm text-matcha-muted">{main.romaji}</span>
            </button>
          )}
          <p className="text-xs text-matcha-muted">
            {[info.level, info.strokes ? `${info.strokes} strokes` : ''].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2.5">
        <ReadingList title="On'yomi (Chinese-origin, in compounds)" readings={info.on} />
        <ReadingList title="Kun'yomi (native Japanese, on its own)" readings={info.kun} />
      </div>
    </div>
  );
}

/** A word's own page: one card per kanji in it. Back returns to the list. */
export function KanjiDetail({ card, onBack }: KanjiDetailProps) {
  const chars = card.chars ?? [];
  const missing = [...card.kanji].filter(isKanji).length > 0 && chars.length === 0;
  return (
    <div className="min-h-screen bg-matcha-bg pb-8">
      <div className="sticky top-0 bg-matcha-surface border-b border-matcha-border z-20">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-3 flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-matcha-badge transition-colors"
            aria-label="Back to all words"
          >
            <ArrowLeft className="w-6 h-6 text-matcha-primary" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-matcha-text">Each kanji</h1>
            <p className="text-xs text-matcha-primary truncate">in <span className="font-kanji text-matcha-text">{card.kanji}</span></p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 md:px-6 pt-3 space-y-2 lg:space-y-0 lg:grid lg:grid-cols-[340px_1fr] lg:gap-4 lg:items-start">
        <div className="bg-matcha-primary text-matcha-onPrimary rounded-[20px] p-5 lg:p-6 lg:sticky lg:top-[5.75rem]">
          <div className="flex items-center gap-1">
            <span className="font-kanji font-bold text-[44px] lg:text-[56px] leading-tight">{card.kanji}</span>
            <SpeakButton text={card.hiragana || card.kanji} label={`Say ${card.kanji}`} big onDark />
          </div>
          <p className="mt-1 text-sm text-[#A8CB98]">{card.hiragana ? `${card.hiragana} · ` : ''}{card.romaji}</p>
          <p className="mt-1 text-sm font-semibold text-matcha-onPrimary">{card.meaning}</p>
        </div>

        <div className="space-y-2">
          {chars.map((c) => <CharCard key={c.char} info={c} />)}

          {chars.some((c) => [...c.on, ...c.kun].some((r) => r.used)) && (
            <p className="pt-1 text-xs text-matcha-muted">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-matcha-primary align-middle mr-1.5" />
              the reading used in {card.kanji}
            </p>
          )}
          {missing && (
            <p className="text-center text-matcha-muted py-6">Details for each kanji aren't available from the server yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
