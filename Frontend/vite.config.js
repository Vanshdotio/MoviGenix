import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  server: {
    proxy: {
      '/sitemap.xml': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      }
    }
  },
  
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-core';
            }
            if (id.includes('gsap') || id.includes('lenis') || id.includes('swiper')) {
              return 'ui-libs';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
