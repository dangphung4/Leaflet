import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['assets/*.svg'],
      manifest: {
        name: 'Notes ig',
        short_name: 'Notes ig',
        description: 'A minimalist note-taking app with cloud sync, dark mode, and offline support.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: '/assets/note.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/assets/note-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: '/assets/note192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/assets/note512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: '/assets/note180.svg',
            sizes: '180x180',
            type: 'image/svg+xml',
            purpose: 'apple-touch-icon'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  publicDir: 'public',
  assetsInclude: ['**/*.svg'],
})