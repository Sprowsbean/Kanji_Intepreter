import type { KanjiCard } from '../types/kanji';

interface KanjiFlashcardProps {
  card: KanjiCard;
}

export function KanjiFlashcard({ card }: KanjiFlashcardProps) {
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
        <div className="text-6xl font-light text-gray-900">{card.kanji}</div>
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
