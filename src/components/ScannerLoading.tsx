import { useSyncExternalStore } from 'react';
import { loadState, onLoadState } from '../services/scanner';

const MB = 1024 * 1024;

/** The first-time download of the text detector (about 26 MB), with a progress bar, so the app doesn't look
 * stuck. Shows nothing once it is ready (or cached from an earlier visit). */
export function ScannerLoading() {
  const s = useSyncExternalStore(onLoadState, loadState);
  if (s.ready) return null;
  if (s.failed) {
    return (
      <div className="bg-black bg-opacity-70 rounded-lg px-4 py-2 text-center text-sm text-yellow-300">
        Couldn't download the scanner. You can still take the photo and adjust the box yourself.
      </div>
    );
  }
  const pct = s.total ? Math.min(100, Math.round((s.loaded / s.total) * 100)) : 0;
  return (
    <div className="bg-black bg-opacity-70 rounded-lg px-4 py-2 text-center text-sm text-white w-72 max-w-full">
      <p>
        {s.total && pct < 100
          ? `Downloading the scanner (first time only): ${(s.loaded / MB).toFixed(0)} of ${(s.total / MB).toFixed(0)} MB`
          : 'Starting the scanner…'}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-gray-700 overflow-hidden">
        <div className={`h-full bg-yellow-400 transition-all ${s.total ? '' : 'w-1/3 animate-pulse'}`}
             style={s.total ? { width: `${pct}%` } : undefined} />
      </div>
      <p className="mt-1 text-xs text-gray-300">You can already take the photo.</p>
    </div>
  );
}
