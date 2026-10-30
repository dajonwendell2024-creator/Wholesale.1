import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Light Vite + React + TS app. Builds to static files that deploy
// as-is to Vercel / Netlify / Cloudflare Pages free tiers.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
