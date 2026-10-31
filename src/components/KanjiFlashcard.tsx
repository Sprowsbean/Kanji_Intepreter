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

export function KanjiFlashcard({ card, selected, onPickKanji, onOpen }: KanjiFlashcardProps) {
  const kanji = [...new Set([...card.kanji].filter(isKanji))];

  const getLevelColor = (level: string) => {
    const levelColors: Record<string, string> = {
      'N5': 'bg-green-100 text-green-800',
      'N4': 'bg-blue-100 text-blue-800',
      'N3': 'bg-yellow-100 text-yellow-800',
      'N2': 'bg-orange-100 text-orange-800',
      'N1': 'bg-red-100 text-red-800',
    };
    return levelColors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div
      onClick={onOpen}
      className={`bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow ${
        onOpen ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-1">
          <div className="text-6xl font-light text-gray-900">
            {/* tap a kanji to see every word that uses it */}
            {[...card.kanji].map((ch, i) =>
              isKanji(ch) && onPickKanji ? (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); onPickKanji(ch); }}
                  className={`rounded-md transition-colors ${
                    ch === selected ? 'bg-yellow-200' : 'hover:bg-gray-100'
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
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(card.level)}`}>
          {card.level}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-500 font-light mb-1">Romaji</p>
          <p className="text-lg text-gray-900">{card.romaji}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500 font-light mb-1">Readings</p>
          <p className="text-base text-gray-900">{card.readings}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500 font-light mb-1">Meaning</p>
          <p className="text-base text-gray-900">{card.meaning}</p>
        </div>

        {card.context && (
          <div>
            <p className="text-sm text-gray-500 font-light mb-1">Context</p>
            <p className="text-base text-gray-900 italic">{card.context}</p>
          </div>
        )}
      </div>

      {onOpen && kanji.length > 0 && (
        <p className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Each kanji: {kanji.join(' · ')}</span>
          <ChevronRight className="w-4 h-4" />
        </p>
      )}
    </div>
  );
}
