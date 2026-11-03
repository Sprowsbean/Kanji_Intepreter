import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Search, X } from 'lucide-react';
import type { KanjiCard } from '../types/kanji';
import { KanjiFlashcard } from './KanjiFlashcard';
import { KanjiDetail } from './KanjiDetail';

interface ResultsViewProps {
  cards: KanjiCard[];
  onBack: () => void;
}

const isKanji = (ch: string) => /[一-鿿々]/.test(ch);

export function ResultsView({ cards, onBack }: ResultsViewProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  // a word's own page (one card per kanji); the list keeps its place underneath
  const [opened, setOpened] = useState<KanjiCard | null>(null);
  const listScroll = useRef(0);

  // the phone's back gesture / browser Back closes the word's page instead of leaving the results
  useEffect(() => {
    const onPop = () => setOpened(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, opened ? 0 : listScroll.current);
  }, [opened]);

  const openCard = (card: KanjiCard) => {
    listScroll.current = window.scrollY;
    history.pushState({ kanjiCard: card.kanji }, '');
    setOpened(card);
  };

  // every single kanji in the found words; ones shared by several words (先 in 先週 / 先 / 先生) first
  const kanjiList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      for (const ch of new Set([...card.kanji].filter(isKanji))) {
        counts.set(ch, (counts.get(ch) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([ch, count]) => ({ ch, count }));
  }, [cards]);

  const q = query.trim().toLowerCase();
  const shown = cards.filter(
    (card) =>
      (!selected || card.kanji.includes(selected)) &&
      (!q || [card.kanji, card.romaji, card.readings, card.meaning].some((f) => f.toLowerCase().includes(q)))
  );

  const pick = (ch: string | null) => {
    setSelected(ch === selected ? null : ch);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (opened) return <KanjiDetail card={opened} onBack={() => history.back()} />;

  return (
    <div className="min-h-screen bg-matcha-bg pb-8">
      <div className="sticky top-0 bg-matcha-surface border-b border-matcha-border z-20">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-3 flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-matcha-badge transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-matcha-primary" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-matcha-text">Results</h1>
            <p className="text-xs text-matcha-primary">
              {shown.length === cards.length
                ? `${cards.length} words · ${kanjiList.length} kanji`
                : `${shown.length} of ${cards.length} words`}
            </p>
          </div>
        </div>

        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 md:px-6 pb-3 flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-matcha-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search kanji, reading or meaning"
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-matcha-border bg-matcha-card text-base text-matcha-text placeholder:text-matcha-muted focus:outline-none focus:ring-2 focus:ring-matcha-primary/40"
            />
          </div>
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className={`flex items-center gap-1 h-11 px-3 rounded-xl border text-base font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-matcha-primary/40 ${
              selected ? 'bg-matcha-primary text-matcha-onPrimary border-matcha-primary font-kanji' : 'bg-matcha-card text-matcha-text border-matcha-border hover:bg-matcha-tint'
            }`}
          >
            {selected ?? 'Kanji'}
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {selected && (
          <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 md:px-6 pb-3">
            <button
              onClick={() => pick(null)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-matcha-badge text-sm text-matcha-text hover:opacity-80"
            >
              Words with {selected}
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {open && (
          <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 md:px-6 pb-4">
            <div className="max-h-72 overflow-y-auto rounded-xl border border-matcha-border bg-matcha-card p-2 grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-12 gap-2">
              <button
                onClick={() => pick(null)}
                className={`col-span-5 sm:col-span-8 lg:col-span-12 py-2 rounded-md text-sm ${
                  selected ? 'text-matcha-muted hover:bg-matcha-tint' : 'bg-matcha-primary text-matcha-onPrimary'
                }`}
              >
                All words
              </button>
              {kanjiList.map(({ ch, count }) => (
                <button
                  key={ch}
                  onClick={() => pick(ch)}
                  className={`relative aspect-square rounded-md font-kanji font-bold text-2xl flex items-center justify-center transition-colors ${
                    ch === selected ? 'bg-matcha-primary text-matcha-onPrimary' : 'bg-matcha-tint text-matcha-text hover:bg-matcha-badge'
                  }`}
                  aria-label={`${ch}, in ${count} word${count > 1 ? 's' : ''}`}
                >
                  {ch}
                  {count > 1 && (
                    <span className="absolute top-0.5 right-1 text-[10px] font-medium opacity-60">{count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 md:px-6 pt-3 space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
        {shown.map((card) => (
          <KanjiFlashcard key={card.kanji} card={card} selected={selected} onPickKanji={pick} onOpen={() => openCard(card)} />
        ))}
        {shown.length === 0 && (
          <p className="text-center text-matcha-muted py-12 lg:col-span-2">
            No words match.{' '}
            <button onClick={() => { setQuery(''); pick(null); }} className="underline">
              Show all
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
