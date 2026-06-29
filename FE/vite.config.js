import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['xlsx', 'xlsx-js-style'],
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
  server: {
    host: mode === 'lan' ? '0.0.0.0' : true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}))
