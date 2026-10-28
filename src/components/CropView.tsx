import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Check, Maximize } from 'lucide-react';
import { detectQuad } from '../services/docScan';
import type { Quad } from '../services/docScan';

interface CropViewProps {
  file: File;
  /** page found by the camera's live detection; when absent the photo is searched for a page */
  initialQuad?: Quad | null;
  onConfirm: (file: File) => void;
  onBack: () => void;
  backLabel: string;
}

// crop rectangle in fractions of the image (0..1)
interface Box { x: number; y: number; w: number; h: number }
type Drag = 'move' | 'nw' | 'ne' | 'sw' | 'se';

const FULL: Box = { x: 0, y: 0, w: 1, h: 1 };
const MIN = 0.08;      // smallest box, as a fraction of the image
const MAX_SIDE = 2400; // larger crops are scaled down before upload: faster on the free server, same OCR

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** the rectangle around a detected page */
function boxAround(q: Quad): Box {
  const x0 = clamp(Math.min(...q.map((p) => p.x)), 0, 1), x1 = clamp(Math.max(...q.map((p) => p.x)), 0, 1);
  const y0 = clamp(Math.min(...q.map((p) => p.y)), 0, 1), y1 = clamp(Math.max(...q.map((p) => p.y)), 0, 1);
  return x1 - x0 < MIN || y1 - y0 < MIN ? FULL : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Choose what gets scanned: a rectangle, resized from its corners or moved by dragging inside it.
 * Only the part inside is sent to the OCR, so background (URL bars, desk, other pages) is left out. */
export function CropView({ file, initialQuad, onConfirm, onBack, backLabel }: CropViewProps) {
  const [url, setUrl] = useState('');
  const [box, setBox] = useState<Box>(initialQuad ? boxAround(initialQuad) : FULL);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ mode: Drag; x: number; y: number; start: Box } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onLoad = () => {
    const img = imgRef.current;
    if (!img || initialQuad) return;
    const q = detectQuad(img, img.naturalWidth, img.naturalHeight); // uploads: look for a page once
    if (q) setBox(boxAround(q));
  };

  const startDrag = (mode: Drag) => (e: ReactPointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, start: box };
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
    if (d.mode.includes('w')) {
      x = clamp(s.x + dx, 0, s.x + s.w - MIN);
      w = s.x + s.w - x;
    } else {
      w = clamp(s.w + dx, MIN, 1 - s.x);
    }
    if (d.mode.includes('n')) {
      y = clamp(s.y + dy, 0, s.y + s.h - MIN);
      h = s.y + s.h - y;
    } else {
      h = clamp(s.h + dy, MIN, 1 - s.y);
    }
    setBox({ x, y, w, h });
  };

  const endDrag = () => {
    drag.current = null;
  };

  const confirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const sx = Math.round(box.x * img.naturalWidth), sy = Math.round(box.y * img.naturalHeight);
    const sw = Math.max(1, Math.round(box.w * img.naturalWidth)), sh = Math.max(1, Math.round(box.h * img.naturalHeight));
    const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    canvas.getContext('2d')?.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      onConfirm(blob ? new File([blob], 'scan.jpg', { type: 'image/jpeg' }) : file);
    }, 'image/jpeg', 0.92);
  };

  const corner = (mode: Drag, pos: string) => (
    <div onPointerDown={startDrag(mode)}
         className={`absolute ${pos} w-10 h-10 -m-5 flex items-center justify-center touch-none`}
         style={{ cursor: mode === 'nw' || mode === 'se' ? 'nwse-resize' : 'nesw-resize' }}>
      <div className="w-5 h-5 rounded-full bg-white border-[3px] border-pink-400 shadow" />
    </div>
  );

  const isFull = box.x === 0 && box.y === 0 && box.w === 1 && box.h === 1;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
      <div className="px-4 pt-4 pb-2 text-center">
        <p className="text-white text-base">Drag the corners around the Japanese text</p>
        <p className="text-gray-400 text-sm">Drag inside the box to move it. Only what's inside is scanned.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 min-h-0"
           onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {url && (
          <div className="relative max-w-full max-h-full">
            <img ref={imgRef} src={url} alt="Photo to scan" draggable={false} onLoad={onLoad}
                 className="block max-w-full max-h-[calc(100vh-15rem)] object-contain" />
            <div onPointerDown={startDrag('move')}
                 className="absolute border-[3px] border-pink-400 touch-none cursor-move"
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
        <button onClick={() => setBox(FULL)} disabled={isFull}
                className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white disabled:opacity-40">
          <Maximize className="w-5 h-5" />
          Whole photo
        </button>
        <button onClick={confirm}
                className="flex items-center gap-2 px-5 py-3 bg-pink-400 hover:bg-pink-500 rounded-full text-white font-medium">
          <Check className="w-5 h-5" />
          Scan
        </button>
      </div>
    </div>
  );
}
