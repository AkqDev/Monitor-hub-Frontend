import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  css: {
    postcss: './postcss.config.js',
  },
  define: {
    // Suppress React warnings in production
    __DEV__: process.env.NODE_ENV !== 'production',
  },
  build: {
    // Optimize build for production
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks to reduce main bundle size
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd'],
          'icons-vendor': ['react-icons', 'lucide-react'],
          'utils-vendor': ['axios', 'socket.io-client', 'moment']
        }
      }
    },
    // Reduce memory usage during build
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    allowedHosts: "monitorhub.onrender.com",
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 3000
  }
})