/* Rechnungs-Tracker – Service Worker
   Alle Pfade sind relativ zum Scope, damit die App sowohl unter
   https://user.github.io/repo/ als auch unter http://127.0.0.1:8765/ laeuft. */

const VERSION    = 'v1';
const SHELL      = 'rt-shell-' + VERSION;   // App-Huelle, bei Update ersetzt
const RUNTIME    = 'rt-runtime-' + VERSION; // grosse Libs, lazy gecached

// Klein und immer noetig -> sofort cachen.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './vendor/tesseract/tesseract.min.js'
];

// 17 MB Tesseract/pdf.js NICHT beim Install ziehen – das wuerde die
// Installation auf Mobilfunk minutenlang blockieren. Stattdessen beim
// ersten echten Gebrauch cachen (danach dauerhaft offline verfuegbar).

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: erst Netz (damit Updates ankommen), dann Cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })
          .then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Alles andere: Cache zuerst, sonst holen und ablegen.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // Nur brauchbare Antworten cachen (kein opaque/Fehler).
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          const bucket = url.pathname.includes('/vendor/') ? RUNTIME : SHELL;
          caches.open(bucket).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
