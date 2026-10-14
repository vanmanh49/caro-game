/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the build works under a GitHub Pages sub-path.
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  test: { environment: 'node', include: ['test/**/*.test.ts'] },
});
