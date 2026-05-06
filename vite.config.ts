import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.webp'],
      manifest: {
        name: 'Swim California Mission Control',
        short_name: 'Swim CA',
        description: 'Local-first operations console for a high-risk endurance swim.',
        theme_color: '#0d2d4e',
        background_color: '#f7fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/manifest-icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/manifest-icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webp,woff2}']
      }
    })
  ]
});
