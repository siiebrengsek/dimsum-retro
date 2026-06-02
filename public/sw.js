// Minimal Service Worker for PWA installation
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return new Response('Offline', { status: 503 });
        })
    );
});
