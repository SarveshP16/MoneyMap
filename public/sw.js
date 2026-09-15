// MoneyMap service worker — enables "Add to Home Screen" installability and
// lets the app boot offline once it's been loaded at least once. Deliberately
// simple: no build tooling, no precache manifest generated at build time
// (Vite's hashed /assets/*.js|css filenames change every build, so a static
// list checked into this file would go stale) — instead the shell's own
// never-hashed files are precached at install, and hashed build assets are
// cached opportunistically the first time they're actually fetched
// (stale-while-revalidate).
//
// What this does NOT do: cache or replay API writes. PUT /api/state is left
// alone entirely — useFinanceStore already handles retrying a failed sync
// once back online, which needs the current full app state, something a
// service worker has no access to.
//
// Bump VERSION whenever this file's caching behavior changes materially —
// it names the caches, so a bump makes `activate` clean out the old ones.
const VERSION = 'v2';
const SHELL_CACHE = `moneymap-shell-${VERSION}`;
const RUNTIME_CACHE = `moneymap-runtime-${VERSION}`;

const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never intercept writes
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // the app owns its own online/offline handling for this

  // Page navigations (opening a route directly, including offline): try the
  // network for a fresh shell, fall back to the cached one so the app still
  // boots without a connection.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // .clone() has to happen right here, synchronously, on the
          // response as it first arrives — deferring it behind another
          // async step (even just caches.open()) risks the browser having
          // already started streaming the original out as the actual page
          // response, which makes a later .clone() throw "body already
          // used". event.waitUntil (not a bare fire-and-forget .then) then
          // keeps the worker alive long enough for the write to land,
          // since it'd otherwise be free to tear down once respondWith's
          // own promise settles.
          const copy = response.clone();
          event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy)));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Everything else same-origin (hashed JS/CSS bundles, icons, fonts routed
  // through this origin): stale-while-revalidate — answer instantly from
  // cache if there is one, refresh the cache in the background regardless.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone(); // see the navigate branch above for why this can't be deferred
            event.waitUntil(caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
