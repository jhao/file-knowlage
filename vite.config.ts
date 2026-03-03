import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  base: '/file-knowlage/',
  define: {
    'process.env.API_KEY': JSON.stringify('abcdefg'),
    'process.env.GEMINI_API_KEY': JSON.stringify('abcdefg'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}));
