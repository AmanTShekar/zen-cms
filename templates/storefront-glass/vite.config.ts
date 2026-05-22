import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Don't precache dynamic query-string URLs or external APIs
          navigateFallbackDenylist: [
            /^\/?preview=/,
            /^\/?api\//,
            /^(https?:\/\/)/,
          ],
        },
        devOptions: {
          // Keep disabled in dev to avoid workbox noise from HMR, query strings, and API calls.
          // Enable only when explicitly testing PWA behavior.
          enabled: false,
        },
      }),
    ],
    server: {
      port: 5173,
      open: true,
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  }
})