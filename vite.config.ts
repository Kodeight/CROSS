import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function buildId(): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  // Vercel exposes the commit SHA; local builds fall back to the timestamp.
  // Read via globalThis (no @types/node needed) so type-checking stays
  // dependency-free and the Linux build never shells out to git.
  try {
    const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const sha = (env?.VERCEL_GIT_COMMIT_SHA ?? '').trim().slice(0, 7);
    return sha ? `${stamp}-${sha}` : stamp;
  } catch {
    return stamp;
  }
}

export default defineConfig({
  // Domain-root deployment (https://crosss-road.vercel.app/): root-relative URLs.
  base: '/',
  define: {
    __CROSS_BUILD__: JSON.stringify(buildId()),
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon/**/*',
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'logo.webp',
        'audio/**/*',
      ],
      manifest: {
        id: '/',
        name: 'CROSS! — Don\'t Get Hit',
        short_name: 'CROSS!',
        description: "Cross as far as you can. Dodge traffic. Collect coins. Beat your best score.",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#FFFDF5',
        background_color: '#FFFDF5',
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,webp,ogg,wav,mp3,woff,woff2,webmanifest}'],
        globIgnores: ['**/favicon-cross.zip', '**/*.zip', '**/logo-orig.webp', '**/favicon.svg'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cross-images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:ogg|mp3|wav)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cross-audio-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
