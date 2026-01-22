import { ArrowLeft } from 'lucide-react';
import type { KanjiCard } from '../types/kanji';
import { KanjiFlashcard } from './KanjiFlashcard';

interface ResultsViewProps {
  cards: KanjiCard[];
  onBack: () => void;
}

export function ResultsView({ cards, onBack }: ResultsViewProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-light text-gray-900">Analysis Results</h1>
            <p className="text-sm text-gray-500">{cards.length} kanji found</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-4">
        {cards.map((card, index) => (
          <KanjiFlashcard key={index} card={card} />
        ))}
      </div>
    </div>
  );
}
