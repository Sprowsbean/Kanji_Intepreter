import { ChevronRight } from 'lucide-react';
import type { KanjiCard } from '../types/kanji';
import { SpeakButton } from './SpeakButton';

interface KanjiFlashcardProps {
  card: KanjiCard;
  selected?: string | null;
  onPickKanji?: (ch: string) => void;
  /** tapping the card opens its page with one card per kanji */
  onOpen?: () => void;
}

const isKanji = (ch: string) => /[一-鿿々]/.test(ch);

// the card shows just the sentence the word was found in: 「先週、先生と…」 without the "Found in:" label
const sentence = (context: string) => context.replace(/^Found in: 「(.*)」/, '$1');

export function KanjiFlashcard({ card, selected, onPickKanji, onOpen }: KanjiFlashcardProps) {
  const kanji = [...new Set([...card.kanji].filter(isKanji))];

  return (
    <div
      onClick={onOpen}
      className={`bg-matcha-card rounded-[20px] p-5 shadow-sm ${onOpen ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1 min-w-0">
          <div className="font-kanji font-bold text-[52px] leading-none text-matcha-text">
            {/* tap a kanji to see every word that uses it */}
            {[...card.kanji].map((ch, i) =>
              isKanji(ch) && onPickKanji ? (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); onPickKanji(ch); }}
                  className={`rounded-md transition-colors ${
                    ch === selected ? 'bg-matcha-badge' : 'hover:bg-matcha-tint'
                  }`}
                  title={`Words with ${ch}`}
                >
                  {ch}
                </button>
              ) : (
                <span key={i}>{ch}</span>
              )
            )}
          </div>
          <SpeakButton text={card.hiragana || card.kanji} label={`Say ${card.kanji}`} />
        </div>
        <span className="shrink-0 bg-matcha-badge text-[#2E4A2E] text-xs font-semibold rounded-full px-2.5 py-1">
          {card.level}
        </span>
      </div>

      <p className="mt-2 text-[17px] font-semibold text-matcha-text">
        {card.hiragana ? `${card.hiragana} · ${card.romaji}` : card.readings}
      </p>
      <p className="mt-0.5 text-[15px] text-matcha-muted">{card.meaning}</p>

      {card.context && (
        <p className="mt-3 bg-matcha-tint rounded-[10px] px-3 py-2.5 text-sm text-matcha-muted font-kanji">
          {sentence(card.context)}
        </p>
      )}

      {onOpen && kanji.length > 0 && (
        <p className="mt-3 pt-3 border-t border-matcha-divider flex items-center justify-between text-sm font-medium text-matcha-text">
          <span>Each kanji: {kanji.join(' · ')}</span>
          <ChevronRight className="w-4 h-4" />
        </p>
      )}
    </div>
  );
}
