import { ArrowLeft } from 'lucide-react';
import type { CharInfo, KanjiCard, Reading } from '../types/kanji';
import { SpeakButton } from './SpeakButton';

interface KanjiDetailProps {
  card: KanjiCard;
  onBack: () => void;
}

const isKanji = (ch: string) => /[一-鿿々]/.test(ch);
const plain = (kana: string) => kana.replace(/[.-]/g, '');

function ReadingList({ title, readings }: { title: string; readings: Reading[] }) {
  if (!readings.length) return null;
  return (
    <div>
      <p className="text-xs text-matcha-muted mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {readings.map((r) => (
          <span
            key={r.kana}
            className={`inline-flex items-center rounded-full px-3 py-1.5 ${
              r.used ? 'bg-matcha-primary text-matcha-onPrimary' : 'bg-matcha-tint border border-matcha-border text-matcha-text'
            }`}
            title={r.used ? 'The reading used in this word' : undefined}
          >
            {/* the dot in た.べる marks where the kanji ends and the kana ending starts */}
            <span className="text-lg font-kanji">{r.kana}</span>
            <span className={`ml-1.5 text-sm ${r.used ? 'text-matcha-bg' : 'text-matcha-muted'}`}>{r.romaji}</span>
            <SpeakButton
              text={plain(r.kana)}
              label={`Say ${plain(r.kana)}`}
              onDark={r.used}
              className="-my-2.5 -mr-2.5"
            />
          </span>
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
      <div className="flex items-start gap-4">
        <div className="font-kanji font-bold text-[68px] leading-none text-matcha-text">{info.char}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[17px] font-semibold text-matcha-text">{info.meaning || '(no entry)'}</p>
          {main && (
            <p className="flex items-center gap-1 text-base text-matcha-text">
              <span className="font-kanji">{plain(main.kana)}</span>
              <span className="text-matcha-muted">{main.romaji}</span>
              <SpeakButton text={plain(main.kana)} label={`Say ${plain(main.kana)}`} big />
            </p>
          )}
          <p className="text-xs text-matcha-muted">
            {[info.level, info.strokes ? `${info.strokes} strokes` : ''].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
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
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-matcha-badge transition-colors"
            aria-label="Back to all words"
          >
            <ArrowLeft className="w-6 h-6 text-matcha-primary" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-matcha-text">Each kanji</h1>
            <p className="text-sm text-matcha-muted truncate">in {card.kanji}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        <div className="bg-matcha-primary text-matcha-onPrimary rounded-[20px] p-5">
          <div className="flex items-center gap-1">
            <span className="font-kanji font-bold text-[44px] leading-tight">{card.kanji}</span>
            <SpeakButton text={card.hiragana || card.kanji} label={`Say ${card.kanji}`} big onDark />
          </div>
          <p className="mt-1 text-matcha-bg">{card.hiragana ? `${card.hiragana} · ` : ''}{card.romaji}</p>
          <p className="mt-1 font-semibold text-matcha-onPrimary">{card.meaning}</p>
        </div>

        {chars.map((c) => <CharCard key={c.char} info={c} />)}

        {chars.some((c) => [...c.on, ...c.kun].some((r) => r.used)) && (
          <p className="text-sm text-matcha-muted">
            <span className="inline-block w-3 h-3 rounded-full bg-matcha-primary align-middle mr-1.5" />
            the reading used in {card.kanji}
          </p>
        )}
        {missing && (
          <p className="text-center text-matcha-muted py-6">Details for each kanji aren't available from the server yet.</p>
        )}
      </div>
    </div>
  );
}
