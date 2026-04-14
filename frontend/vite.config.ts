import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/graph': { target: 'http://localhost:8080', changeOrigin: true },
      '/nodes': { target: 'http://localhost:8080', changeOrigin: true },
      '/edges': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
