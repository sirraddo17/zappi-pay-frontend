import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The whole point of this app being a PWA rather than a native build is
// installability without an app store — manifest below is what makes
// "Install app" show up in Chrome/Edge on both desktop and Android, and
// "Add to Home Screen" work sanely on iOS Safari.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'ZAPPI PAY',
        short_name: 'ZAPPI PAY',
        description: 'Buy airtime, data, electricity, cable TV, and education pins from your wallet.',
        theme_color: '#f97316',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
