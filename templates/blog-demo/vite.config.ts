import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


const proxyErrorHandler = (err: any, req: any, res: any) => {
  if (err.code === 'ECONNREFUSED') {
    if (res && res.writeHead) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Backend starting up...');
    }
  }
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
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
    },
  },
})