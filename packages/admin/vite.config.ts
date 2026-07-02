/// <reference types="vitest" />
import type { ServerResponse } from 'node:http'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/

const proxyErrorHandler = (err: Error & { code?: string }, _req: unknown, res: ServerResponse) => {
  if (err.code === 'ECONNREFUSED') {
    if (res && res.writeHead) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Backend starting up...');
    }
  }
};

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Zenith CMS Admin',
        short_name: 'Zenith',
        description: 'Enterprise-grade headless content management system',
        theme_color: '#000000',
        background_color: '#000000',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000
      }
    })
  ],

  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/unit/setup.ts'],
    env: {
      // Provide a fully-qualified base URL so the api.ts module resolves
      // absolute URLs in the Node test environment. MSW intercepts this origin.
      VITE_API_URL: 'http://localhost:5173/api/v1',
    },
    exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
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
    // Reduce chunk size warnings threshold for enterprise bundle
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-animation';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
              return 'vendor-forms';
            }
            // Isolate all @zenithcms plugin packages into their own chunk
            // so they are only downloaded when a plugin route is accessed
            if (id.includes('@zenithcms/plugin-') || id.includes('plugin-workflows-ui') || id.includes('plugin-ai-architect-ui') || id.includes('plugin-multiplayer-crdt')) {
              return 'vendor-plugins';
            }
            return 'vendor';
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
