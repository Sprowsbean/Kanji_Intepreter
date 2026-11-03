export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Reads Japanese aloud with the phone's own voice (Web Speech API: free, no server). */
export function speak(text: string) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.8;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('ja'));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}
