import { useEffect, useRef, useState } from 'react';
import { X, Circle } from 'lucide-react';
import { DEFAULT_QUAD, detectQuad } from '../services/docScan';
import type { Quad } from '../services/docScan';

interface CameraCaptureProps {
  /** quad: the page/screen corners found when the photo was taken (null = none found) */
  onCapture: (file: File, quad: Quad | null) => void;
  onClose: () => void;
}

const DETECT_EVERY_MS = 200; // ~5 checks a second: each takes a few ms on a PC, a few times more on a phone
const SMOOTH = 0.5;      // blend new corners with the previous ones so the border doesn't jitter
const LOST_AFTER = 4;    // frames without a page before the border falls back to the guide frame

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // a ref, not state: the unmount cleanup must see the stream that was opened after mount
  const streamRef = useRef<MediaStream | null>(null);
  const quadRef = useRef<Quad | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [error, setError] = useState<string>('');
  // where the video frame actually sits on screen (object-cover crops it), to draw the border on top
  const [view, setView] = useState({ ox: 0, oy: 0, w: 1, h: 1 });

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

  // live page detection, like a document scanner: find the page/screen and draw its border
  useEffect(() => {
    let lost = 0;
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;
      const r = video.getBoundingClientRect();
      const scale = Math.max(r.width / video.videoWidth, r.height / video.videoHeight);
      const w = video.videoWidth * scale, h = video.videoHeight * scale;
      setView({ ox: (r.width - w) / 2, oy: (r.height - h) / 2, w, h });

      const found = detectQuad(video, video.videoWidth, video.videoHeight);
      if (found) {
        lost = 0;
        const prev = quadRef.current;
        const next = (prev
          ? found.map((p, i) => ({ x: prev[i].x + (p.x - prev[i].x) * SMOOTH, y: prev[i].y + (p.y - prev[i].y) * SMOOTH }))
          : found) as Quad;
        quadRef.current = next;
        setQuad(next);
      } else if (++lost >= LOST_AFTER) {
        quadRef.current = null;
        setQuad(null);
      }
    }, DETECT_EVERY_MS);
    return () => clearInterval(timer);
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
    const corners = quadRef.current;

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        stopCamera();
        onCapture(file, corners);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // border in screen pixels: the detected page, or the guide frame when nothing is found
  const shown = quad ?? DEFAULT_QUAD;
  const pts = shown.map((p) => `${view.ox + p.x * view.w},${view.oy + p.y * view.h}`).join(' ');

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
                fill={quad ? 'rgba(244,114,182,0.15)' : 'none'}
                stroke={quad ? '#f472b6' : 'rgba(255,255,255,0.8)'}
                strokeWidth={3}
                strokeDasharray={quad ? undefined : '10 8'}
                strokeLinejoin="round"
              />
            </svg>
            <p className="absolute top-4 inset-x-0 text-center text-white text-sm drop-shadow px-4">
              {quad ? 'Page found: hold still and tap the button'
                    : 'Point at the page or screen. You can adjust the corners after.'}
            </p>
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
