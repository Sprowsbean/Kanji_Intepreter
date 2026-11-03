import type { MouseEvent } from 'react';
import { Volume2 } from 'lucide-react';
import { canSpeak, speak } from '../services/speech';

interface SpeakButtonProps {
  text: string;
  label: string;
  big?: boolean;
  /** white icon, for the dark green word card */
  onDark?: boolean;
  /** extra layout classes, e.g. negative margins so the 44 px target doesn't make a chip taller */
  className?: string;
}

export function SpeakButton({ text, label, big, onDark, className = '' }: SpeakButtonProps) {
  if (!canSpeak) return null;
  return (
    <button
      onClick={(e: MouseEvent) => { e.stopPropagation(); speak(text); }}
      className={`w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full transition-colors ${
        onDark ? 'text-white hover:bg-white/15' : 'text-matcha-primary hover:bg-matcha-badge'
      } ${className}`}
      aria-label={label}
      title={label}
    >
      <Volume2 className={big ? 'w-6 h-6' : 'w-5 h-5'} />
    </button>
  );
}
