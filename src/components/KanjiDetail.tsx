import { ArrowLeft } from 'lucide-react';
import type { CharInfo, KanjiCard, Reading } from '../types/kanji';
import { SpeakButton } from './SpeakButton';

interface KanjiDetailProps {
  card: KanjiCard;
  onBack: () => void;
}

const isKanji = (ch: string) => /[一-鿿々]/.test(ch);
const plain = (kana: string) => kana.replace(/[.-]/g, '');

function ReadingList({ title, hint, readings }: { title: string; hint: string; readings: Reading[] }) {
  if (!readings.length) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{title} <span className="text-gray-400">({hint})</span></p>
      <div className="flex flex-wrap gap-1.5">
        {readings.map((r) => (
          <span
            key={r.kana}
            className={`inline-flex items-center rounded-full pl-3 pr-0.5 border ${
              r.used ? 'bg-yellow-100 border-yellow-300' : 'bg-gray-50 border-gray-200'
            }`}
            title={r.used ? 'The reading used in this word' : undefined}
          >
            {/* the dot in た.べる marks where the kanji ends and the kana ending starts */}
            <span className="text-lg text-gray-900">{r.kana}</span>
            <span className="ml-1.5 text-sm text-gray-500">{r.romaji}</span>
            <SpeakButton text={plain(r.kana)} label={`Say ${plain(r.kana)}`} />
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
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <div className="text-7xl font-light text-gray-900 leading-none">{info.char}</div>
        <div className="flex-1 min-w-0">
          <p className="text-lg text-gray-900">{info.meaning || '(no entry)'}</p>
          {main && (
            <p className="flex items-center gap-1 text-gray-700">
              <span className="text-xl">{plain(main.kana)}</span>
              <span className="text-gray-500">{main.romaji}</span>
              <SpeakButton text={plain(main.kana)} label={`Say ${plain(main.kana)}`} big />
            </p>
          )}
          <p className="text-xs text-gray-500">
            {[info.level, info.strokes ? `${info.strokes} strokes` : ''].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <ReadingList title="On'yomi" hint="Chinese-origin reading, mostly in compounds" readings={info.on} />
        <ReadingList title="Kun'yomi" hint="native Japanese reading, mostly on its own" readings={info.kun} />
      </div>
    </div>
  );
}

/** A word's own page: one card per kanji in it. Back returns to the list. */
export function KanjiDetail({ card, onBack }: KanjiDetailProps) {
  const chars = card.chars ?? [];
  const missing = [...card.kanji].filter(isKanji).length > 0 && chars.length === 0;
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Back to all words">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-light text-gray-900">Each kanji</h1>
            <p className="text-sm text-gray-500 truncate">in {card.kanji}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-1">
            <span className="text-5xl font-light text-gray-900">{card.kanji}</span>
            <SpeakButton text={card.hiragana || card.kanji} label={`Say ${card.kanji}`} big />
          </div>
          <p className="mt-1 text-gray-700">{card.hiragana ? `${card.hiragana} · ` : ''}{card.romaji}</p>
          <p className="mt-1 text-gray-900">{card.meaning}</p>
        </div>

        {chars.map((c) => <CharCard key={c.char} info={c} />)}

        {chars.some((c) => [...c.on, ...c.kun].some((r) => r.used)) && (
          <p className="text-sm text-gray-500">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300 align-middle mr-1.5" />
            the reading used in {card.kanji}
          </p>
        )}
        {missing && (
          <p className="text-center text-gray-500 py-6">Details for each kanji aren't available from the server yet.</p>
        )}
      </div>
    </div>
  );
}
