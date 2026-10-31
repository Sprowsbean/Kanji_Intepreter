// Finds the text you are aiming at, live in the browser, with the same text-detection model the OCR uses
// (meikiocr's detector, run by onnxruntime-web). Like the iPhone: a box appears around the text near the
// centre of the view; that box becomes the crop. Works on documents, products, screens and signs alike,
// because it looks for text, not for a page outline.
import type * as Ort from 'onnxruntime-web';

/** rectangle in fractions of the image (0..1) */
export interface Box { x: number; y: number; w: number; h: number }
/** a detected text box in image pixels */
export interface TextBox { x1: number; y1: number; x2: number; y2: number; score: number }

const MODEL_URL =
  'https://huggingface.co/rtr46/meiki.text.detect.v0/resolve/main/meiki.text.detect.v0.1.320x192.onnx';
const ORT_VERSION = '1.20.1'; // keep in sync with package.json
// the model maker's small variant: on 157 test lines it found the same text as the 960x544 one, 5x faster
// (60 vs 324 ms per frame on one CPU thread). An int8-compressed copy lost half the words, so it isn't used.
const IN_W = 320, IN_H = 192; // the model's input size
const MIN_SCORE = 0.3;
const GAP = 2.5;        // join text up to this many character heights away
const SIZE_RATIO = 2;  // ...if its characters are at most twice as big or small (a long false box is not)

const WASM_URL = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/ort-wasm-simd-threaded.wasm`;
// unpacked sizes of the two pinned files (the CDN sends the engine compressed, so its Content-Length is smaller)
const SIZES = { wasm: 11_246_032, model: 14_084_361 };
const CACHE = 'kanji-scanner-v2'; // the downloaded files are kept here, so the download happens once per phone

/** How far the first-time download is (engine + model, in bytes), for the loading message. */
export interface LoadState { loaded: number; total: number; ready: boolean; failed: boolean }

let state: LoadState = { loaded: 0, total: 0, ready: false, failed: false };
const listeners = new Set<() => void>();
const setState = (next: Partial<LoadState>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };
export const loadState = () => state;
export function onLoadState(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

/** Fetches a file, from the scanner cache when it was downloaded before, reporting the bytes received. */
async function download(url: string, report: (loaded: number) => void): Promise<Uint8Array> {
  const cache = typeof caches === 'undefined' ? null : await caches.open(CACHE).catch(() => null); // https only
  // drop files of older versions (v1 held the bigger 960x544 model)
  if (cache) caches.keys().then((ks) => ks.filter((k) => k.startsWith('kanji-scanner-') && k !== CACHE).forEach((k) => caches.delete(k))).catch(() => {});
  const cached = await cache?.match(url);
  const res = cached ?? await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status}): ${url}`);
  const reader = res.body!.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    report(loaded);
  }
  const bytes = new Uint8Array(loaded);
  let at = 0;
  for (const p of parts) { bytes.set(p, at); at += p.length; }
  // saved after reading, so the progress moves while it downloads; a full disk only costs a re-download
  if (!cached) await cache?.put(url, new Response(bytes)).catch(() => {});
  return bytes;
}

let session: Promise<Ort.InferenceSession> | null = null;
let ortModule: typeof Ort | null = null;

/** Loads the engine and the model once (about 26 MB the first time, then from the cache). */
export function loadTextFinder(): Promise<Ort.InferenceSession> {
  if (!session) {
    session = (async () => {
      setState({ failed: false });
      const got = [0, 0];
      setState({ total: SIZES.wasm + SIZES.model });
      const report = (i: number) => (loaded: number) => { got[i] = loaded; setState({ loaded: got[0] + got[1] }); };
      const [ort, wasm, model] = await Promise.all([
        import('onnxruntime-web'), download(WASM_URL, report(0)), download(MODEL_URL, report(1)),
      ]);
      ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
      ort.env.wasm.wasmBinary = wasm; // already downloaded above, with progress
      ortModule = ort;
      const s = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
      setState({ ready: true });
      return s;
    })();
    session.catch((err) => { // allow a retry after a network error
      console.warn('text finder failed to load', err);
      session = null;
      setState({ failed: true });
    });
  }
  return session;
}

/** Text boxes in a frame (video, image or canvas), in its own pixel coordinates. */
export async function findText(source: CanvasImageSource, srcW: number, srcH: number): Promise<TextBox[]> {
  const s = await loadTextFinder();
  const ort = ortModule!;
  const scale = Math.min(IN_W / srcW, IN_H / srcH);
  const w = Math.floor(srcW * scale), h = Math.floor(srcH * scale);
  const canvas = document.createElement('canvas');
  canvas.width = IN_W;
  canvas.height = IN_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, IN_W, IN_H); // padding is zeros, as in meikiocr
  ctx.imageSmoothingQuality = 'high'; // a 1920 px frame shrinks 6x: average the pixels, don't skip them
  ctx.drawImage(source, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, IN_W, IN_H).data;
  const n = IN_W * IN_H;
  const input = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) { // the model was trained on OpenCV images: BGR channel order, 0..1
    input[i] = rgba[i * 4 + 2] / 255;
    input[n + i] = rgba[i * 4 + 1] / 255;
    input[2 * n + i] = rgba[i * 4] / 255;
  }
  const out = await s.run({
    images: new ort.Tensor('float32', input, [1, 3, IN_H, IN_W]),
    orig_target_sizes: new ort.Tensor('int64', BigInt64Array.from([BigInt(Math.round(IN_W / scale)), BigInt(Math.round(IN_H / scale))]), [1, 2]),
  });
  const boxes = out.boxes.data as Float32Array, scores = out.scores.data as Float32Array;
  const found: TextBox[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] < MIN_SCORE) continue;
    const [x1, y1, x2, y2] = boxes.slice(i * 4, i * 4 + 4);
    found.push({ x1: Math.max(0, x1), y1: Math.max(0, y1), x2: Math.min(srcW, x2), y2: Math.min(srcH, y2), score: scores[i] });
  }
  return found;
}

/**
 * The area of interest: start from the text nearest the centre of the view (where the user aims) and
 * grow to the neighbouring text of the same block (lines of a paragraph, parts of a label). Returns
 * null when there is no text near the centre.
 */
export function textRegion(boxes: TextBox[], w: number, h: number): Box | null {
  const live = boxes.filter((b) => b.x2 - b.x1 > 2 && b.y2 - b.y1 > 2);
  if (!live.length) return null;
  const cx = w / 2, cy = h / 2;
  const distTo = (b: TextBox) => Math.hypot(Math.max(b.x1 - cx, 0, cx - b.x2), Math.max(b.y1 - cy, 0, cy - b.y2));
  const seed = live.reduce((a, b) => (distTo(b) < distTo(a) ? b : a));
  if (distTo(seed) > 0.3 * Math.hypot(w, h)) return null; // nothing near where the user is aiming
  const size = (b: TextBox) => Math.min(b.x2 - b.x1, b.y2 - b.y1); // character height (or width if vertical)
  let r = { x1: seed.x1, y1: seed.y1, x2: seed.x2, y2: seed.y2 };
  const used = new Set([seed]);
  for (let grew = true; grew;) {
    grew = false;
    const sizes = [...used].map(size).sort((a, b) => a - b);
    const med = sizes[sizes.length >> 1];
    const gap = GAP * med; // normal line spacing and table cells still belong to the block
    for (const b of live) {
      if (used.has(b)) continue;
      // only text of a similar size: a heading twice the body size joins, a stray giant box does not
      if (size(b) > SIZE_RATIO * med || size(b) < med / SIZE_RATIO) continue;
      const dx = Math.max(b.x1 - r.x2, r.x1 - b.x2, 0), dy = Math.max(b.y1 - r.y2, r.y1 - b.y2, 0);
      if (dx <= gap && dy <= gap) {
        used.add(b);
        r = { x1: Math.min(r.x1, b.x1), y1: Math.min(r.y1, b.y1), x2: Math.max(r.x2, b.x2), y2: Math.max(r.y2, b.y2) };
        grew = true;
      }
    }
  }
  const sizes = [...used].map(size).sort((a, b) => a - b);
  const pad = 0.5 * sizes[sizes.length >> 1]; // a little margin so edge characters aren't clipped
  const x1 = Math.max(0, r.x1 - pad), y1 = Math.max(0, r.y1 - pad);
  const x2 = Math.min(w, r.x2 + pad), y2 = Math.min(h, r.y2 + pad);
  return { x: x1 / w, y: y1 / h, w: (x2 - x1) / w, h: (y2 - y1) / h };
}
