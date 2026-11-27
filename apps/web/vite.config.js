import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 4173, strictPort: true, proxy: { '/api': 'http://localhost:8787' } },
  preview: { port: 4173, strictPort: true, proxy: { '/api': 'http://localhost:8787' } }
});
