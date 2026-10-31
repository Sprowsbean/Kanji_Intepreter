// The scan flow, built from existing models (nothing hand-tuned here):
// - documents: scanic's ML corner detector (DocCornerNet, ~3.4 MB incl. runtime, MIT) finds the page, and
//   scanic straightens it (perspective correction), like the iPhone Notes scanner;
// - anything else (products, screens, signs): the OCR's own text detector finds the text near the centre.
import { extractDocument, scanDocument } from 'scanic';
import type { CornerPoints } from 'scanic';
import { findText, loadTextFinder, textRegion } from './textFinder';
import type { Box } from './textFinder';

export type { Box } from './textFinder';
export type { CornerPoints } from 'scanic';
export { loadState, onLoadState } from './textFinder';
export type { LoadState } from './textFinder';

/** Starts the first-time download of both detectors early (the app calls it on its home screen), so they
 * are usually ready by the time the camera opens. Safe to call more than once. */
export function preloadScanner() {
  const blank = document.createElement('canvas');
  blank.width = blank.height = 64;
  findDocument(blank); // scanic loads its ML model (~3.4 MB) on the first detection
  loadTextFinder().catch(() => {}); // the failure is shown by the loading message
}

/** A page found by scanic's ML detector (corners in the source's pixels), or null. */
export async function findDocument(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<CornerPoints | null> {
  try {
    const r = await scanDocument(source, { detector: 'ml', mode: 'detect' });
    return r.success && r.corners ? r.corners : null;
  } catch (err) {
    console.warn('document detection failed', err);
    return null;
  }
}

/** The text near the centre of the view, as a rectangle (fractions of the frame), or null. */
export async function findTextBox(source: CanvasImageSource, w: number, h: number): Promise<Box | null> {
  try {
    return textRegion(await findText(source, w, h), w, h);
  } catch (err) {
    console.warn('text detection failed', err);
    return null;
  }
}

/** Cut out the page and straighten it into a flat, front-on image. */
export async function straighten(img: HTMLImageElement | HTMLCanvasElement, corners: CornerPoints): Promise<HTMLCanvasElement | null> {
  const r = await extractDocument(img, corners, { output: 'canvas' });
  return r.success && r.output instanceof HTMLCanvasElement ? r.output : null;
}

/** The rectangle around a page's corners, as fractions of the image. */
export function boxAround(c: CornerPoints, w: number, h: number): Box {
  const xs = [c.topLeft.x, c.topRight.x, c.bottomRight.x, c.bottomLeft.x];
  const ys = [c.topLeft.y, c.topRight.y, c.bottomRight.y, c.bottomLeft.y];
  const x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(w, Math.max(...xs));
  const y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(h, Math.max(...ys));
  return { x: x0 / w, y: y0 / h, w: (x1 - x0) / w, h: (y1 - y0) / h };
}
