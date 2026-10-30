import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Check, Crop, Maximize } from 'lucide-react';
import { boxAround, findDocument, findTextBox, straighten } from '../services/scanner';
import type { Box, CornerPoints } from '../services/scanner';
import type { Found } from './CameraCapture';

interface CropViewProps {
  file: File;
  /** what the camera's live detection saw; absent for uploads, which are searched once here */
  found?: Found;
  onConfirm: (file: File) => void;
  onBack: () => void;
  backLabel: string;
}

type Drag = 'move' | 'nw' | 'ne' | 'sw' | 'se';

const FULL: Box = { x: 0, y: 0, w: 1, h: 1 };
const MIN = 0.08;      // smallest box, as a fraction of the image
const MAX_SIDE = 2400; // larger crops are scaled down before upload: faster on the free server, same OCR

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const toFile = (canvas: HTMLCanvasElement, fallback: File) =>
  new Promise<File>((ok) => canvas.toBlob((b) => ok(b ? new File([b], 'scan.jpg', { type: 'image/jpeg' }) : fallback), 'image/jpeg', 0.92));

function scaled(src: CanvasImageSource, sx: number, sy: number, sw: number, sh: number): HTMLCanvasElement {
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * scale));
  c.height = Math.max(1, Math.round(sh * scale));
  c.getContext('2d')!.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c;
}

/** After the photo, like the iPhone scanner: a found page is shown cut out and straightened; otherwise a
 * rectangle around the text, which can be resized from its corners or moved. Only that part is scanned. */
export function CropView({ file, found, onConfirm, onBack, backLabel }: CropViewProps) {
  const [url, setUrl] = useState('');
  const [doc, setDoc] = useState<CornerPoints | null>(found?.doc ?? null);
  const [mode, setMode] = useState<'page' | 'box'>(found?.doc ? 'page' : 'box');
  const [page, setPage] = useState<HTMLCanvasElement | null>(null);
  const [box, setBox] = useState<Box>(found?.text ?? FULL);
  const [status, setStatus] = useState(found ? '' : 'Looking for the page or text…');
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: Drag; x: number; y: number; start: Box } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onLoad = async () => {
    const img = imgRef.current;
    if (!img) return;
    let corners = doc;
    if (!found) { // upload: look for a page, else for text, once
      corners = await findDocument(img);
      if (corners) { setDoc(corners); setMode('page'); }
      else {
        const t = await findTextBox(img, img.naturalWidth, img.naturalHeight);
        if (t) setBox(t);
      }
      setStatus('');
    }
    if (corners) {
      const flat = await straighten(img, corners);
      if (flat) setPage(flat); else setMode('box');
      setBox(boxAround(corners, img.naturalWidth, img.naturalHeight));
    }
  };

  // show the straightened page (a canvas) inside the page view
  useEffect(() => {
    const host = pageRef.current;
    if (!host || !page) return;
    page.className = 'block max-w-full max-h-[calc(100vh-15rem)] object-contain bg-white';
    host.replaceChildren(page);
  }, [page, mode]);

  const startDrag = (m: Drag) => (e: ReactPointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { mode: m, x: e.clientX, y: e.clientY, start: box };
  };

  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    const rect = imgRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = (e.clientX - d.x) / rect.width;
    const dy = (e.clientY - d.y) / rect.height;
    const s = d.start;
    if (d.mode === 'move') {
      setBox({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) });
      return;
    }
    // a corner moves two sides; the opposite corner stays put, so it is always a rectangle
    let { x, y, w, h } = s;
    if (d.mode.includes('w')) { x = clamp(s.x + dx, 0, s.x + s.w - MIN); w = s.x + s.w - x; }
    else w = clamp(s.w + dx, MIN, 1 - s.x);
    if (d.mode.includes('n')) { y = clamp(s.y + dy, 0, s.y + s.h - MIN); h = s.y + s.h - y; }
    else h = clamp(s.h + dy, MIN, 1 - s.y);
    setBox({ x, y, w, h });
  };

  const endDrag = () => { drag.current = null; };

  const confirm = async () => {
    const img = imgRef.current;
    if (!img) return;
    setBusy(true);
    const canvas = mode === 'page' && page
      ? scaled(page, 0, 0, page.width, page.height)
      : scaled(img, Math.round(box.x * img.naturalWidth), Math.round(box.y * img.naturalHeight),
               Math.max(1, Math.round(box.w * img.naturalWidth)), Math.max(1, Math.round(box.h * img.naturalHeight)));
    onConfirm(await toFile(canvas, file));
  };

  const corner = (m: Drag, pos: string) => (
    <div onPointerDown={startDrag(m)}
         className={`absolute ${pos} w-10 h-10 -m-5 flex items-center justify-center touch-none`}
         style={{ cursor: m === 'nw' || m === 'se' ? 'nwse-resize' : 'nesw-resize' }}>
      <div className="w-5 h-5 rounded-full bg-white border-[3px] border-yellow-400 shadow" />
    </div>
  );

  const isFull = box.x === 0 && box.y === 0 && box.w === 1 && box.h === 1;
  const showPage = mode === 'page' && page;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
      <div className="px-4 pt-4 pb-2 text-center">
        <p className="text-white text-base">
          {status || (showPage ? 'Page found and straightened' : 'Drag the corners around the Japanese text')}
        </p>
        <p className="text-gray-400 text-sm">
          {showPage ? 'Scan it, or adjust the box yourself' : "Drag inside the box to move it. Only what's inside is scanned."}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 min-h-0"
           onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {showPage && <div ref={pageRef} className="max-w-full max-h-full shadow-lg" />}
        {url && (
          <div className={`relative max-w-full max-h-full ${showPage ? 'hidden' : ''}`}>
            <img ref={imgRef} src={url} alt="Photo to scan" draggable={false} onLoad={onLoad}
                 className="block max-w-full max-h-[calc(100vh-15rem)] object-contain" />
            <div onPointerDown={startDrag('move')}
                 className="absolute border-[3px] border-yellow-400 touch-none cursor-move"
                 style={{
                   left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%`,
                   boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', // dims everything outside the box
                 }}>
              {corner('nw', 'left-0 top-0')}
              {corner('ne', 'right-0 top-0')}
              {corner('sw', 'left-0 bottom-0')}
              {corner('se', 'right-0 bottom-0')}
            </div>
          </div>
        )}
      </div>

      <div className="bg-black bg-opacity-90 p-4 flex items-center justify-between gap-3">
        <button onClick={onBack}
                className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white">
          <ArrowLeft className="w-5 h-5" />
          {backLabel}
        </button>
        {showPage ? (
          <button onClick={() => setMode('box')}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white">
            <Crop className="w-5 h-5" />
            Adjust box
          </button>
        ) : (
          <button onClick={() => setBox(FULL)} disabled={isFull}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white disabled:opacity-40">
            <Maximize className="w-5 h-5" />
            Whole photo
          </button>
        )}
        <button onClick={confirm} disabled={busy || !!status}
                className="flex items-center gap-2 px-5 py-3 bg-pink-400 hover:bg-pink-500 rounded-full text-white font-medium disabled:opacity-60">
          <Check className="w-5 h-5" />
          Scan
        </button>
      </div>
    </div>
  );
}
