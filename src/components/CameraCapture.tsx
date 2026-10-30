import { useEffect, useRef, useState } from 'react';
import { X, Circle } from 'lucide-react';
import { findDocument, findTextBox } from '../services/scanner';
import type { Box, CornerPoints } from '../services/scanner';

/** what the live detection saw when the photo was taken (both in the photo's own coordinates) */
export interface Found {
  /** a page/document's corners in pixels (scanic ML detector), or null */
  doc: CornerPoints | null;
  /** the text near the centre, as fractions of the photo (OCR text detector), or null */
  text: Box | null;
}

interface CameraCaptureProps {
  onCapture: (file: File, found: Found) => void;
  onClose: () => void;
}

const DOC_EVERY_MS = 250;   // scanic's ML detector: ~20 ms per frame on a PC
const TEXT_EVERY_MS = 900;  // the text detector is heavier (~0.4 s on a PC), so less often
const LOST_AFTER = 3;       // misses in a row before a shown border disappears (stops flicker)
const GUIDE: Box = { x: 0.08, y: 0.25, w: 0.84, h: 0.5 }; // shown when nothing is found yet

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // a ref, not state: the unmount cleanup must see the stream that was opened after mount
  const streamRef = useRef<MediaStream | null>(null);
  const foundRef = useRef<Found>({ doc: null, text: null });
  const [found, setFound] = useState<Found>({ doc: null, text: null });
  const [error, setError] = useState<string>('');
  // where the video frame actually sits on screen (object-cover crops it), to draw the border on top
  const [view, setView] = useState({ ox: 0, oy: 0, w: 1, h: 1, vw: 1, vh: 1 });

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera needs HTTPS (or localhost). Use "Upload File" instead.');
        return;
      }
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          // ask for a sharp frame; the default 640x480 is too small for OCR
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          // unmounted while the permission prompt was open
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError('Unable to access camera. Please check permissions.');
        console.error('Camera error:', err);
      }
    };
    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []);

  // live detection, like the iPhone scanner: a page gets its outline; otherwise the text near the centre
  // gets a box. Each detector runs only when its previous run has finished, so a slow phone never piles up.
  useEffect(() => {
    let stopped = false, docMiss = 0, textMiss = 0, docBusy = false, textBusy = false;
    const update = (next: Partial<Found>) => {
      foundRef.current = { ...foundRef.current, ...next };
      setFound(foundRef.current);
    };
    const ready = () => {
      const v = videoRef.current;
      if (!v || !v.videoWidth) return null;
      const r = v.getBoundingClientRect();
      const scale = Math.max(r.width / v.videoWidth, r.height / v.videoHeight);
      const w = v.videoWidth * scale, h = v.videoHeight * scale;
      setView({ ox: (r.width - w) / 2, oy: (r.height - h) / 2, w, h, vw: v.videoWidth, vh: v.videoHeight });
      return v;
    };
    const docTimer = setInterval(async () => {
      const v = ready();
      if (!v || docBusy) return;
      docBusy = true;
      const doc = await findDocument(v);
      docBusy = false;
      if (stopped) return;
      if (doc) { docMiss = 0; update({ doc }); } else if (++docMiss >= LOST_AFTER) update({ doc: null });
    }, DOC_EVERY_MS);
    const textTimer = setInterval(async () => {
      const v = ready();
      if (!v || textBusy || foundRef.current.doc) return; // a page outline wins; no need for the text box
      textBusy = true;
      const text = await findTextBox(v, v.videoWidth, v.videoHeight);
      textBusy = false;
      if (stopped) return;
      if (text) { textMiss = 0; update({ text }); } else if (++textMiss >= LOST_AFTER) update({ text: null });
    }, TEXT_EVERY_MS);
    return () => { stopped = true; clearInterval(docTimer); clearInterval(textTimer); };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const seen = foundRef.current;

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        stopCamera();
        onCapture(file, seen);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // overlay in screen pixels
  const px = (x: number, y: number) => `${view.ox + (x / view.vw) * view.w},${view.oy + (y / view.vh) * view.h}`;
  const fr = (b: Box) => [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]
    .map(([x, y]) => `${view.ox + x * view.w},${view.oy + y * view.h}`).join(' ');
  const d = found.doc;
  const pts = d ? [d.topLeft, d.topRight, d.bottomRight, d.bottomLeft].map((p) => px(p.x, p.y)).join(' ')
                : fr(found.text ?? GUIDE);
  const hint = d ? 'Page found: hold still and tap the button'
             : found.text ? 'Text found: tap the button, you can adjust the box next'
             : 'Center the text you want to scan';

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white text-center px-4">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <polygon
                points={pts}
                fill={d || found.text ? 'rgba(250,204,21,0.18)' : 'none'}
                stroke={d || found.text ? '#facc15' : 'rgba(255,255,255,0.8)'}
                strokeWidth={3}
                strokeDasharray={d || found.text ? undefined : '10 8'}
                strokeLinejoin="round"
              />
            </svg>
            <p className="absolute top-4 inset-x-0 text-center text-white text-sm drop-shadow px-4">{hint}</p>
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      <div className="bg-black bg-opacity-90 p-6 flex items-center justify-between">
        <button
          onClick={handleClose}
          className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Close camera"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={capturePhoto}
          disabled={!!error}
          className="p-4 bg-pink-400 hover:bg-pink-500 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Capture photo"
        >
          <Circle className="w-12 h-12 text-white" strokeWidth={2} />
        </button>

        <div className="w-14"></div>
      </div>
    </div>
  );
}
