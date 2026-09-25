import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

function buildId(): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  try {
    const hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim().slice(0, 7);
    return `${stamp}-${hash}`;
  } catch {
    return stamp;
  }
}

export default defineConfig({
  // Domain-root deployment (https://crosss-road.vercel.app/): root-relative URLs.
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  define: {
    __CROSS_BUILD__: JSON.stringify(buildId()),
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon/**/*',
        'favicon.svg',
      ],
      manifest: {
        name: 'CROSS!',
        short_name: 'CROSS!',
        description: "Cross as far as you can. Don't get hit.",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#7AC74F',
        background_color: '#7AC74F',
        icons: [
          {
            src: 'favicon/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'favicon/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'favicon/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Core app-shell + runtime caching for fonts so the installed game
        // launches offline after the first successful load.
        globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
        globIgnores: ['**/favicon*.svg'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cross-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
});
