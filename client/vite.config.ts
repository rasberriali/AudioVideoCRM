import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
  tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://lively-enjoyment-testing.up.railway.app',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
