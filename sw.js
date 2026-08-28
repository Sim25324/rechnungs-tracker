/* Rechnungs-Tracker – Service Worker
   Alle Pfade sind relativ zum Scope, damit die App sowohl unter
   https://user.github.io/repo/ als auch unter http://127.0.0.1:8765/ laeuft.

   VERSION bei jeder Aenderung an den App-Dateien hochzaehlen.
   Ohne neue VERSION bleibt der alte Cache aktiv und Geraete bekommen
   das Update nicht zu sehen. */

const VERSION = 'v9';
const SHELL   = 'rt-shell-'   + VERSION;   // App-Huelle, bei Update ersetzt
const RUNTIME = 'rt-runtime-' + VERSION;   // grosse Libs, lazy gecached
const SHARE   = 'rt-share';                // Uebergabe geteilter Dateien, versionslos

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

// Die 17 MB Tesseract/pdf.js werden NICHT beim Install gezogen – das wuerde
// die Installation auf Mobilfunk minutenlang blockieren. Sie landen beim
// ersten echten Gebrauch im Cache und sind danach dauerhaft offline da.

self.addEventListener('install', event => {
  // Bewusst KEIN skipWaiting(): der neue Worker wartet, die App zeigt
  // stattdessen unten das Update-Banner. Erst der Tap darauf schickt
  // 'skipWaiting' und loest den Wechsel samt Reload aus.
  event.waitUntil(
    caches.open(SHELL).then(cache => cache.addAll(SHELL_FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== RUNTIME && k !== SHARE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

/* ---------------------------------------------------------------
   Share Target: Android postet die geteilte Datei als multipart-POST
   an ./share-target. Diese URL existiert auf dem Server nicht – sie
   wird ausschliesslich hier abgefangen. Die Datei landet kurz im
   Cache SHARE, danach Redirect auf ./?shared=N; die Seite holt sie
   sich dort ab und raeumt auf.
   --------------------------------------------------------------- */
async function handleShareTarget(request){
  const home = new URL('./', self.location).href;
  try{
    const fd    = await request.formData();
    const files = fd.getAll('beleg').filter(f => f && typeof f === 'object' && f.size > 0);
    const cache = await caches.open(SHARE);
    for (const k of await cache.keys()) await cache.delete(k);   // Reste verwerfen

    let n = 0;
    for (const f of files) {
      await cache.put(
        new URL('./__shared__/' + n, self.location).href,
        new Response(f, { headers: {
          'content-type': f.type || 'application/octet-stream',
          'x-filename'  : encodeURIComponent(f.name || ('beleg-' + n))
        }})
      );
      n++;
    }
    return Response.redirect(home + '?shared=' + n, 303);
  }catch(err){
    return Response.redirect(home + '?shared=0', 303);
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const reqUrl = new URL(req.url);

  if (req.method === 'POST' && reqUrl.pathname.endsWith('/share-target')) {
    event.respondWith(handleShareTarget(req));
    return;
  }
  if (req.method !== 'GET') return;

  const url = reqUrl;
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
