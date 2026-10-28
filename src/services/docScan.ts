// Document-scanner helper (like the iPhone Notes scanner), in the browser, no libraries:
// find the page/screen in a frame, so the camera can outline it and the crop box can start around it.

export interface Point { x: number; y: number }
/** corners as fractions of the image (0..1), clockwise from top-left */
export type Quad = [Point, Point, Point, Point];

export const DEFAULT_QUAD: Quad = [
  { x: 0.06, y: 0.12 }, { x: 0.94, y: 0.12 }, { x: 0.94, y: 0.88 }, { x: 0.06, y: 0.88 },
];

const DETECT_WIDTH = 200; // detection works on a tiny copy: fast enough to run live on a phone

function polygonArea(q: Point[]): number {
  let a = 0;
  for (let i = 0; i < q.length; i++) {
    const p = q[i], n = q[(i + 1) % q.length];
    a += p.x * n.y - n.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** Largest connected region where mask is set; returns its pixel indices. */
function largestRegion(mask: Uint8Array, w: number, h: number): Int32Array {
  const label = new Int32Array(w * h).fill(-1);
  const stack = new Int32Array(w * h);
  let best: number[] = [];
  let id = 0;
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || label[start] !== -1) continue;
    const region: number[] = [];
    let top = 0;
    stack[top++] = start;
    label[start] = id;
    while (top) {
      const i = stack[--top];
      region.push(i);
      const x = i % w, y = (i / w) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nb) {
        if (j >= 0 && mask[j] && label[j] === -1) { label[j] = id; stack[top++] = j; }
      }
    }
    if (region.length > best.length) best = region;
    id++;
  }
  return Int32Array.from(best);
}

/** Corners of a region: the classic extreme-point trick (min/max of x+y and x-y). */
function regionCorners(region: Int32Array, w: number, h: number): Quad {
  let tl = 0, tr = 0, br = 0, bl = 0;
  let minS = Infinity, maxS = -Infinity, minD = Infinity, maxD = -Infinity;
  for (const i of region) {
    const x = i % w, y = (i / w) | 0;
    const s = x + y, d = x - y;
    if (s < minS) { minS = s; tl = i; }
    if (s > maxS) { maxS = s; br = i; }
    if (d > maxD) { maxD = d; tr = i; }
    if (d < minD) { minD = d; bl = i; }
  }
  const pt = (i: number) => ({ x: (i % w) / (w - 1), y: ((i / w) | 0) / (h - 1) });
  return [pt(tl), pt(tr), pt(br), pt(bl)];
}

// Tuned on 34 test images: all 16 photos of a page on a surface found (uneven light included), no false
// find on 18 others (full-screen screenshots, a dark title card, a scroll, real photos without a page).
const EDGE_FLOOR = 18;      // minimum edge strength (Sobel |gx|+|gy| on a lightly blurred image)
const EDGE_K = 2.0;         // ...or this many times the image's median edge strength, if higher
const MIN_AREA = 0.25;      // smaller "pages" are usually one text line; cropping to it would cut text
const MAX_AREA = 0.95;      // bigger: the page already fills the view, nothing to crop
const FILL = [0.85, 1.1];   // the region must fill its four corners like a real (convex) page

/**
 * Find a page or screen by its outline, like a document scanner: mark strong edges, flood the background
 * in from the image border, and whatever the flood can't reach (the page with all its text) is the page.
 * Edges work under uneven light, where a bright/dark split merges the page with the background.
 * Returns null when there is no clear four-cornered page; the caller then uses a guide frame.
 */
export function detectQuad(source: CanvasImageSource, srcW: number, srcH: number): Quad | null {
  if (!srcW || !srcH) return null;
  const w = DETECT_WIDTH, h = Math.max(3, Math.round((DETECT_WIDTH * srcH) / srcW));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  return detectQuadPixels(ctx.getImageData(0, 0, w, h).data, w, h);
}

/** detectQuad on raw RGBA pixels (already scaled to DETECT_WIDTH wide); no DOM, so it can be tested. */
export function detectQuadPixels(data: Uint8ClampedArray, w: number, h: number): Quad | null {
  const n = w * h;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) gray[i] = (data[i * 4] * 77 + data[i * 4 + 1] * 150 + data[i * 4 + 2] * 29) >> 8;
  const g = new Float32Array(n); // 3x3 box blur against camera noise
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy >= 0 && yy < h && xx >= 0 && xx < w) { s += gray[yy * w + xx]; c++; }
        }
      }
      g[y * w + x] = s / c;
    }
  }
  const mag = new Float32Array(n); // Sobel edge strength
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1] - g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1];
      const gy = g[i + w - 1] + 2 * g[i + w] + g[i + w + 1] - g[i - w - 1] - 2 * g[i - w] - g[i - w + 1];
      mag[i] = Math.abs(gx) + Math.abs(gy);
    }
  }
  const sorted = Float32Array.from(mag).sort();
  const thr = Math.max(EDGE_FLOOR, EDGE_K * sorted[n >> 1]);
  const edge = new Uint8Array(n);
  for (let y = 0; y < h; y++) { // edges, thickened by one pixel to close small gaps in the outline
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      edge[i] = mag[i] > thr || (x > 0 && mag[i - 1] > thr) || (x < w - 1 && mag[i + 1] > thr)
        || (y > 0 && mag[i - w] > thr) || (y < h - 1 && mag[i + w] > thr) ? 1 : 0;
    }
  }
  // flood the background from the border through non-edge pixels
  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  const seed = (i: number) => { if (!edge[i] && !bg[i]) { bg[i] = 1; queue[tail++] = i; } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (head < tail) {
    const i = queue[head++], x = i % w;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (i >= w) seed(i - w);
    if (i < n - w) seed(i + w);
  }
  const notBg = new Uint8Array(n);
  for (let i = 0; i < n; i++) notBg[i] = bg[i] ? 0 : 1;
  const region = largestRegion(notBg, w, h);
  const frac = region.length / n;
  if (frac < MIN_AREA || frac > MAX_AREA) return null;
  const quad = regionCorners(region, w, h);
  const fill = region.length / Math.max(1, polygonArea(quad.map((p) => ({ x: p.x * (w - 1), y: p.y * (h - 1) }))));
  return fill >= FILL[0] && fill <= FILL[1] ? quad : null;
}
