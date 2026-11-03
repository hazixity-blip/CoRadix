// Bump this number whenever you change cached files, so students get the update.
const VERSION = 'v1';
const CACHE = 'coradix-' + VERSION;
const SCOPE = self.registration.scope;

const PRECACHE = [
  './', 'index.html', 'login.html', 'offline.html', 'manifest.json',
  'Favicon.jpeg', 'Logo.jpeg',
  'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // add each file separately so one missing file doesn't break install
      Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('coradix-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle our own files. Login/auth/database calls to other
  // origins (Firebase, Supabase, Google, etc.) go straight to the network, never cached.
  if (url.origin !== location.origin) return;
  if (!url.href.startsWith(SCOPE)) return;

  // Pages: network first (always fresh), fall back to cache, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('offline.html')))
    );
    return;
  }

  // Static files: serve from cache instantly, refresh in background
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
