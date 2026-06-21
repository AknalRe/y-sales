import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import fs from 'node:fs';

const rootEnvDir = path.resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, '');
  const httpsEnabled = String(env.VITE_DEV_HTTPS_ENABLED ?? 'false').toLowerCase() === 'true';
  const certPath = path.resolve(__dirname, env.VITE_DEV_TLS_CERT_PATH ?? '192.168.18.66+2.pem');
  const keyPath = path.resolve(__dirname, env.VITE_DEV_TLS_KEY_PATH ?? '192.168.18.66+2-key.pem');

  return {
    envDir: rootEnvDir,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // xlsx-js-style is inherently large (~870KB); raise limit to suppress noise.
      // For further reduction, xlsx would need dynamic import() in the export feature.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // MediaPipe — lazy loaded only when camera opens, keep isolated
            if (id.includes('@mediapipe')) return 'vendor-mediapipe';

            // Supabase realtime / auth
            if (id.includes('@supabase')) return 'vendor-supabase';

            // Map / geo
            if (id.includes('leaflet')) return 'vendor-leaflet';

            // Excel export — rarely used, keep isolated so it never blocks initial load
            if (id.includes('xlsx-js-style')) return 'vendor-xlsx';

            // NOTE: date-fns intentionally NOT chunked separately —
            // it has transitive deps that overlap with vendor-react causing
            // a circular chunk warning. Rollup places it automatically.

            // Core UI framework chunks (stable, cached aggressively by browser)
            // NOTE: @base-ui/react depends on react/react-dom internally,
            // so it must live in the same chunk to avoid circular dependency warning.
            if (
              id.includes('@base-ui/react') ||
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('/react/')
            ) return 'vendor-react';
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            if (
              id.includes('lucide-react') ||
              id.includes('clsx') ||
              id.includes('class-variance-authority') ||
              id.includes('tailwind-merge')
            ) return 'vendor-ui';
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'YukSales',
          short_name: 'YukSales',
          description: 'PWA tracking sales, absensi, kontrol kunjungan, dan sinkronisasi order offline.',
          theme_color: '#0f172a',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
      }),
    ],
    server: {
      host: true,
      ...(httpsEnabled ? {
        https: {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        },
      } : {}),
    },
  };
});
