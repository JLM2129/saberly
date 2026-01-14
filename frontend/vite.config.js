import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-icon.png'],
      manifest: {
        name: 'Saberly - Prep ICFES',
        short_name: 'Saberly',
        description: 'Plataforma de preparación para el examen ICFES Saber 11 con modo offline.',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    }
  }
})
