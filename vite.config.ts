import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { PAGES_BASE } from './src/lib/project.ts';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react(), tailwindcss()],
  base:
    command === 'serve' && !isPreview
      ? '/'
      : process.env.PAGES_BASE || PAGES_BASE,
  server: { port: 5173, strictPort: true },
}));
