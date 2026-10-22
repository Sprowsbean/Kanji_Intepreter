import type { KanjiCard } from '../types/kanji';

interface KanjiFlashcardProps {
  card: KanjiCard;
  selected?: string | null;
  onPickKanji?: (ch: string) => void;
}

const isKanji = (ch: string) => /[一-鿿々]/.test(ch);

export function KanjiFlashcard({ card, selected, onPickKanji }: KanjiFlashcardProps) {
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
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="text-6xl font-light text-gray-900">
          {/* tap a kanji to see every word that uses it */}
          {[...card.kanji].map((ch, i) =>
            isKanji(ch) && onPickKanji ? (
              <button
                key={i}
                onClick={() => onPickKanji(ch)}
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
    </div>
  );
}
