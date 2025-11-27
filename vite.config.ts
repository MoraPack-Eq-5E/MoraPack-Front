import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar React y librerías core
          'react-vendor': ['react', 'react-dom'],
          
          'tanstack-vendor': ['@tanstack/react-router', '@tanstack/react-query'],
          
          // Separar Leaflet
          'map-vendor': ['leaflet'],
          
          // Componentes de mapa 
          'map-components': [
            './src/features/map/components/MapView.tsx',
            './src/features/map/components/MapViewTemporal.tsx',
            './src/features/map/components/MapCanvas.tsx',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
