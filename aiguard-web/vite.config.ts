import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: false,
    allowedHosts: [
      'nttu-demo.io.vn',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5185',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://127.0.0.1:5185',
        ws: true,
      },
    },
  },
})
