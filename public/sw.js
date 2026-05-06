// Minimal Service Worker for PWA installation
self.addEventListener('install', (event) => {
    // console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
    // Pass-through strategy
    event.respondWith(fetch(event.request));
});
