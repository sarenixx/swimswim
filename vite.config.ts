import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

declare const process: {
  env: {
    GITHUB_ACTIONS?: string;
  };
};

const base = process.env.GITHUB_ACTIONS ? '/swimswim/' : '/';

export default defineConfig({
  base,
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.app.github.dev',
      '.preview.app.github.dev',
      '.trycloudflare.com',
      '.loca.lt'
    ]
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true
  },
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
            src: `${base}manifest-icon-192.svg`,
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: `${base}manifest-icon-512.svg`,
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webp,woff2}'],
        importScripts: ['push-handler.js']
      }
    })
  ]
});
