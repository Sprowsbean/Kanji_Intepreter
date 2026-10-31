import type { MouseEvent } from 'react';
import { Volume2 } from 'lucide-react';

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Reads Japanese aloud with the phone's own voice (Web Speech API: free, no server). */
function speak(text: string) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.8;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('ja'));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

export function SpeakButton({ text, label, big }: { text: string; label: string; big?: boolean }) {
  if (!canSpeak) return null;
  return (
    <button
      onClick={(e: MouseEvent) => { e.stopPropagation(); speak(text); }}
      className={`${big ? 'p-2.5' : 'p-1.5'} rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900`}
      aria-label={label}
      title={label}
    >
      <Volume2 className={big ? 'w-6 h-6' : 'w-4 h-4'} />
    </button>
  );
}
