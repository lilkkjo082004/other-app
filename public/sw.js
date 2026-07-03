// OTHER service worker — offline app shell + runtime asset caching.
// Cross-origin requests (e.g. the AI proxy) are never intercepted.
// Cache name carries the build id (stamped into __BUILD__ at build time by
// scripts/stamp-sw.mjs). A new deploy => new sw.js bytes => the browser runs an
// update cycle, and the new name makes activate() purge the previous version's
// assets instead of letting them pile up.
const CACHE = 'other-__BUILD__';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  // Deliberately NOT skipWaiting() here: the new worker waits until the user
  // accepts the "Update ready" prompt (which posts SKIP_WAITING), so we never
  // swap bundles out from under an active session.
});

// The page asks us to activate the freshly-installed worker when the user taps
// the update pill.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave the AI proxy etc. to the network

  // App navigations: network-first (revalidating past any HTTP cache so a new
  // deploy is picked up immediately), falling back to the cached shell offline.
  // After caching the fresh index.html, prune hashed /assets/ entries it no
  // longer references — without this, every deploy left its old bundles (up to
  // ~6MB each with the on-device model chunk) in the cache forever.
  // (Also match direct index.html fetches — the in-app update check — so they
  // aren't served stale by the asset cache below.)
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const forCache = res.clone();
          const forPrune = res.clone();
          e.waitUntil((async () => {
            try {
              const c = await caches.open(CACHE);
              await c.put('./index.html', forCache);
              const html = await forPrune.text();
              // Assets named by the fresh index.html are definitely current.
              // Dynamically-imported chunks (e.g. the on-device AI model shim)
              // aren't listed there, so those are trimmed by age instead:
              // keep the most recent few, evict the rest (Cache API keys come
              // back in insertion order, so the head is the oldest).
              const live = new Set((html.match(/assets\/[A-Za-z0-9._-]+/g) || []));
              const keys = await c.keys();
              const unref = keys.filter((k) => {
                const m = new URL(k.url).pathname.match(/assets\/[A-Za-z0-9._-]+$/);
                return m && !live.has(m[0]);
              });
              await Promise.all(unref.slice(0, Math.max(0, unref.length - 4)).map((k) => c.delete(k)));
            } catch (err) { /* best-effort */ }
          })());
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Same-origin assets: cache-first, then populate the cache.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => hit)
    )
  );
});

// Push notifications (companion check-ins).
self.addEventListener('push', (e) => {
  let d = { title: 'Other', body: 'Your companions are thinking about you ✦', url: './' };
  try { if (e.data) d = { ...d, ...e.data.json() }; } catch (err) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title || 'Other', {
    body: d.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
