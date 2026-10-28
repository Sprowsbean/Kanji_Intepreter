import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Check, Maximize } from 'lucide-react';
import { detectQuad, FULL_QUAD, isFullQuad, warpQuad } from '../services/docScan';
import type { Quad } from '../services/docScan';

interface CropViewProps {
  file: File;
  /** corners found by the camera's live detection; when absent the photo is searched for a page */
  initialQuad?: Quad | null;
  onConfirm: (file: File) => void;
  onBack: () => void;
  backLabel: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Like the iPhone Notes scanner: drag the four corners onto the page or screen. On Scan, only that
 * part is cut out and straightened, so background (URL bars, desk, other pages) never reaches the OCR. */
export function CropView({ file, initialQuad, onConfirm, onBack, backLabel }: CropViewProps) {
  const [url, setUrl] = useState('');
  const [quad, setQuad] = useState<Quad>(initialQuad ?? FULL_QUAD);
  const [found, setFound] = useState(!!initialQuad);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef<number | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const onLoad = () => {
    const img = imgRef.current;
    if (!img || initialQuad) return;
    const q = detectQuad(img, img.naturalWidth, img.naturalHeight); // uploads: look for a page once
    if (q) {
      setQuad(q);
      setFound(true);
    }
  };

  const onPointerDown = (i: number) => (e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = i;
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const i = dragging.current;
    const rect = imgRef.current?.getBoundingClientRect();
    if (i === null || !rect) return;
    const p = { x: clamp01((e.clientX - rect.left) / rect.width), y: clamp01((e.clientY - rect.top) / rect.height) };
    setQuad((q) => q.map((c, k) => (k === i ? p : c)) as Quad);
  };

  const endDrag = () => {
    dragging.current = null;
  };

  const confirm = () => {
    const img = imgRef.current;
    if (!img) return;
    setBusy(true);
    // let the "Straightening..." label paint before the (synchronous) warp runs
    requestAnimationFrame(() => setTimeout(() => {
      const canvas = isFullQuad(quad) ? warpQuad(img, FULL_QUAD) : warpQuad(img, quad);
      canvas.toBlob((blob) => {
        onConfirm(blob ? new File([blob], 'scan.jpg', { type: 'image/jpeg' }) : file);
      }, 'image/jpeg', 0.92);
    }, 0));
  };

  const pts = quad.map((p) => `${p.x * 100},${p.y * 100}`).join(' ');

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
      <div className="px-4 pt-4 pb-2 text-center">
        <p className="text-white text-base">
          {found ? 'Check the corners, then Scan' : 'Drag the corners onto the Japanese text'}
        </p>
        <p className="text-gray-400 text-sm">Only the part inside the border is scanned</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 min-h-0"
           onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {url && (
          <div className="relative max-w-full max-h-full">
            <img ref={imgRef} src={url} alt="Photo to scan" draggable={false} onLoad={onLoad}
                 className="block max-w-full max-h-[calc(100vh-15rem)] object-contain" />
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                 viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* dim everything outside the border */}
              <path d={`M0,0 H100 V100 H0 Z M${pts.replace(/ /g, ' L')} Z`} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
              <polygon points={pts} fill="none" stroke="#f472b6" strokeWidth={3} vectorEffect="non-scaling-stroke" />
            </svg>
            {quad.map((p, i) => (
              <div key={i} onPointerDown={onPointerDown(i)}
                   className="absolute w-10 h-10 -ml-5 -mt-5 flex items-center justify-center touch-none cursor-grab"
                   style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
                <div className="w-5 h-5 rounded-full bg-white border-[3px] border-pink-400 shadow" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-black bg-opacity-90 p-4 flex items-center justify-between gap-3">
        <button onClick={onBack}
                className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white">
          <ArrowLeft className="w-5 h-5" />
          {backLabel}
        </button>
        <button onClick={() => setQuad(FULL_QUAD)} disabled={isFullQuad(quad)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-full text-white disabled:opacity-40">
          <Maximize className="w-5 h-5" />
          Whole photo
        </button>
        <button onClick={confirm} disabled={busy}
                className="flex items-center gap-2 px-5 py-3 bg-pink-400 hover:bg-pink-500 rounded-full text-white font-medium disabled:opacity-60">
          <Check className="w-5 h-5" />
          {busy ? 'Straightening…' : 'Scan'}
        </button>
      </div>
    </div>
  );
}
