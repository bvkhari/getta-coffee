/**
 * Offline fallback only. Nothing about a stamp card is cached.
 *
 * A cached card would show a stale count, and the one place that matters is the
 * counter, with the customer standing there. So every request goes to the
 * network, and the cache exists purely so a page opened with no signal shows
 * something branded instead of the browser's error page.
 *
 * The service worker also satisfies Chrome's install criteria, which is what
 * makes Android offer its own "Install app" prompt rather than burying it in a
 * menu.
 */
const CACHE = "getta-shell-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      // A new worker should take over at the next navigation rather than
      // waiting for every tab of the old one to close.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Navigations only. Leaving POSTs and data requests alone means a stamp can
  // never be served, replayed or swallowed by this worker.
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL)),
  );
});
