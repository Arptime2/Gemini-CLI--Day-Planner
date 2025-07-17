const CACHE_NAME = 'momentum-cache-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/tasks.html',
    '/habits.html',
    '/notes.html',
    '/calendar.html',
    '/settings.html',
    '/css/main.css',
    '/css/calendar.css',
    '/css/habits.css',
    '/css/notes.css',
    '/css/settings.css',
    '/js/db/database.js',
    '/js/features/calendar.js',
    '/js/features/habits.js',
    '/js/features/notes.js',
    '/js/features/settings.js',
    '/js/features/sync.js',
    '/js/features/tasks.js',
    '/js/groq.js',
    '/js/ui.js',
    '/js/utils/qrcode.js'
];

let offerSdp = null;
let answerSdp = null;

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.pathname === '/webrtc-offer') {
        if (offerSdp) {
            event.respondWith(new Response(JSON.stringify({ offer: offerSdp }), { headers: { 'Content-Type': 'application/json' } }));
        } else {
            event.respondWith(new Response(JSON.stringify({ offer: null }), { headers: { 'Content-Type': 'application/json' } }));
        }
    } else if (url.pathname === '/webrtc-answer') {
        if (event.request.method === 'POST') {
            event.request.json().then(data => {
                answerSdp = data.answer;
                event.respondWith(new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } }));
            });
        } else if (answerSdp) {
            event.respondWith(new Response(JSON.stringify({ answer: answerSdp }), { headers: { 'Content-Type': 'application/json' } }));
            answerSdp = null; // Clear after sending
        }
         else {
            event.respondWith(new Response(JSON.stringify({ answer: null }), { headers: { 'Content-Type': 'application/json' } }));
        }
    } else {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request);
                })
        );
    }
});

self.addEventListener('message', event => {
    if (event.data.type === 'SET_OFFER') {
        offerSdp = event.data.offer;
    }
});