{# Copyright 2023 Endless OS Foundation, LLC #}
{# SPDX-License-Identifier: MIT #}

const VERSION = '{{ version }}';

/* Stub ServiceWorker to keep Chrome happy. */
self.addEventListener('install', (event) => {
    console.log('Installing ServiceWorker version:', VERSION);
});
