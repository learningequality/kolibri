{% load i18n core_tags webpack_tags content_tags cache %}

const VERSION = '{{ version }}';

/* Stub ServiceWorker to keep Chrome happy. */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing ServiceWorker version:', VERSION);
});
