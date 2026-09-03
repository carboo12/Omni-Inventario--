import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // PWA activa en build (no en dev para agilizar iteración)
    ...(mode === 'production'
      ? [VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['apple-touch-icon.png'],
          manifest: {
            name: 'Omni Inventario +',
            short_name: 'OmniInv+',
            description: 'Sistema Integrado de Gestión Inventario',
            theme_color: '#3b82f6',
            background_color: '#0f172a',
            display: 'standalone',
            start_url: '/',
            icons: [
              { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            navigateFallback: 'index.html',
            navigateFallbackDenylist: [/^\/api/],
            cleanupOutdatedCaches: true,
            runtimeCaching: [
              {
                urlPattern: ({ url }) => url.pathname.startsWith('/api/actions'),
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  networkTimeoutSeconds: 5,
                  expiration: { maxEntries: 50, maxAgeSeconds: 300 },
                },
              },
            ],
          },
        })]
      : []),
  ],
  resolve: {
    alias: [
      // Redirigir imports de server actions del frontend a los wrappers de transporte
      { find: /^@\/lib\/actions\/.+/, replacement: (p) => {
          // Convertir @/lib/actions/<mod> -> @/lib/actions-client/<mod> (path absoluto)
          const mod = p.replace(/^@\/lib\/actions\//, '');
          const base = fileURLToPath(new URL('./src/lib/actions-client', import.meta.url));
          return `${base}/${mod}`;
        } },
      // src/actions/* -> actions-client (activation, etc.)
      { find: /^@\/actions\/.+/, replacement: (p) => {
          const mod = p.replace(/^@\/actions\//, '');
          const base = fileURLToPath(new URL('./src/lib/actions-client', import.meta.url));
          return `${base}/${mod}`;
        } },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // server-only -> no-op en el bundle del cliente
      { find: 'server-only', replacement: fileURLToPath(new URL('./src/lib/server-only.ts', import.meta.url)) },
    ],
  },
  server: {
    port: 5173,
    host: true,
    // Proxy a la API en dev (evita CORS)
    proxy: {
      '/api/actions': {
        target: process.env.API_URL || 'http://localhost:9003',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['@tanstack/react-router'],
          charts: ['recharts'],
          excel: ['xlsx'],
        },
      },
    },
  },
}));