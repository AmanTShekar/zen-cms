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
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy) => { proxy.on('error', proxyErrorHandler); }
      },
      '/media': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy) => { proxy.on('error', proxyErrorHandler); }
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy) => { proxy.on('error', proxyErrorHandler); }
      },
      '/collaboration': {
        target: 'ws://127.0.0.1:3000',
        ws: true,
        configure: (proxy) => { proxy.on('error', proxyErrorHandler); }
      },
    },
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit'],
          'vendor-animation': ['framer-motion', 'lucide-react'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // All other node_modules go into a catch-all vendor chunk
        },
      },
    },
  },
})