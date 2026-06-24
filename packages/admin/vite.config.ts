/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/

const proxyErrorHandler = (err: any, _req: any, res: any) => {
  if (err.code === 'ECONNREFUSED') {
    if (res && res.writeHead) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Backend starting up...');
    }
  }
};

export default defineConfig({
  base: '/',
  plugins: [react()],

  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    env: {
      // Provide a fully-qualified base URL so the api.ts module resolves
      // absolute URLs in the Node test environment. MSW intercepts this origin.
      VITE_API_URL: 'http://localhost:5173/api/v1',
    },
    exclude: ['e2e/**/*', 'node_modules/**/*'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '5175', 10),
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.CORE_PORT || '3000'}`,
        changeOrigin: true,
        configure: (proxy) => { proxy.on('error', proxyErrorHandler); }
      },
      '/uploads': {
        target: `http://127.0.0.1:${process.env.CORE_PORT || '3000'}`,
        changeOrigin: true,
        configure: (proxy) => { proxy.on('error', proxyErrorHandler); }
      },
      '/collaboration': {
        target: `ws://127.0.0.1:${process.env.CORE_PORT || '3000'}`,
        ws: true,
        configure: (proxy) => { proxy.on('error', proxyErrorHandler); }
      },
    },
  },
  build: {
    target: 'esnext',
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor chunks
          if (id.includes('node_modules/react')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/lexical')) {
            return 'vendor-editor';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react')) {
            return 'vendor-animation';
          }
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform/resolvers') || id.includes('node_modules/zod')) {
            return 'vendor-forms';
          }
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
})
