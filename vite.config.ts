import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png'],
      manifest: {
        name: '记账',
        short_name: '记账',
        theme_color: '#1e3a5f',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    }),
  ],
})
