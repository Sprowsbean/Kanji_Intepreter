import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
// `npm run dev:phone` serves over HTTPS on your Wi-Fi (phone camera needs HTTPS).
// In dev, /analyze is proxied to the local backend, so the phone only talks to this server.
export default defineConfig(({ mode }) => ({
  // lucide-react is pre-bundled (no optimizeDeps.exclude): served as ~1400 separate icon files,
  // ad blockers block icons/fingerprint.js and the whole app renders blank in dev.
  plugins: [react(), ...(mode === 'phone' ? [basicSsl()] : [])],
  server: {
    host: mode === 'phone' ? true : undefined,
    proxy: {
      '/analyze': 'http://localhost:8000',
    },
  },
}));
