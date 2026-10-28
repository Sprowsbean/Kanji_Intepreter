import type { KanjiCard } from '../types/kanji';

// Calls the local FastAPI backend (meikiocr + pykakasi + jamdict). No API key needed.
// Empty in dev: requests go to /analyze on the Vite server, which proxies to the backend.
const API_URL = import.meta.env.VITE_API_URL ?? '';

// deployed: the free Hugging Face Space sleeps when unused and takes a minute to wake up
const UNREACHABLE = API_URL
  ? 'The server is waking up (free hosting sleeps when unused). Please try again in a minute.'
  : 'Cannot reach the backend. Is it running? (uvicorn on port 8000)';

export async function analyzeKanjiImage(imageFile: File): Promise<KanjiCard[]> {
  const form = new FormData();
  form.append('file', imageFile);
  const res = await fetch(`${API_URL}/analyze`, { method: 'POST', body: form }).catch(() => {
    throw new Error(UNREACHABLE);
  });
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    // Vite's dev proxy (backend down) or a Space that is still starting answers this way
    throw new Error(UNREACHABLE);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'Failed to analyze image');
  }
  return (await res.json()).cards as KanjiCard[];
}
