
const CACHE_NAME = 'zenith-v21';
const urlsToCache = [
    './',
    './index.html',
    './tasks.html',
    './habits.html',
    './notes.html',
    './calendar.html',
    './settings.html',
    './css/main.css',
    './css/notes.css',
    './css/habits.css',
    './css/settings.css',
    './css/calendar.css',
    './js/ui.js',
    './js/db/database.js',
    './js/features/tasks.js',
    './js/features/habits.js',
    './js/features/notes.js',
    './js/features/calendar.js',
    './js/features/settings.js',
    './js/groq.js',
    './nav.html'
];

// On install, cache all core assets and take control immediately
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching all assets');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Force the waiting service worker to become the active one.
    );
});

// On activation, remove old caches and take control of all clients
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all open pages.
    );
});

// Fetch event: Use Stale-While-Revalidate strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // If we got a valid response, update the cache
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });

                // Return the cached response immediately, and the fetch promise will update the cache in the background.
                return cachedResponse || fetchPromise;
            });
        })
    );
});
