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
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-tanstack': ['@tanstack/react-query'],
            'vendor-base-ui': ['@base-ui/react'],
            'vendor-ui': ['lucide-react', 'clsx', 'class-variance-authority', 'tailwind-merge'],
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
          description: 'PWA sales tracking, attendance, visit control, and offline order sync.',
          theme_color: '#0f172a',
          background_color: '#020617',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
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
    }
  };
});

