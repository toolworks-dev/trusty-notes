const CACHE_NAME = 'trustynotes-cache-v0.1.6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/main.tsx',
  '/src/styles/richtext.css',
  '/site.webmanifest',
  
  // Icons
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/icons/new-note.png',
  
  // Screenshots
  '/screenshots/app.png',
  
  // Core app assets
  '/src/App.tsx',
  '/src/components/MarkdownEditor.tsx',
  '/src/components/SyncSettings.tsx',
  '/src/components/MobileNav.tsx',
  
  // External resources
  'https://plausible.toolworks.dev/js/script.js',
  
  // Images referenced in meta tags
  'https://raw.githubusercontent.com/toolworks-dev/trusty-notes/main/trusty-notes.png'
];

const API_ROUTES = [
  'https://sync.trustynotes.app'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (API_ROUTES.some(route => event.request.url.startsWith(route))) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request.clone())
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('', {
              status: 408,
              statusText: 'Request timed out.'
            });
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 