// SmartFarm service worker (PRD 7: offline crop guides and last weather forecast).
// Hand-written and small on purpose. Bump VERSION when this file's caching rules change.
const VERSION = "v2";
const PAGES = `sf-pages-${VERSION}`;
const ASSETS = `sf-assets-${VERSION}`;
const OFFLINE_URL = "/offline";

// Pages saved for offline reading. Private areas (/farmer, /business, /admin, /login) are never cached.
const OFFLINE_PAGES = [/^\/guides(\/|$)/, /^\/weather(\/|$)/];
// Build output and images never change at the same URL, so serve them from cache first.
const STATIC_ASSETS = [/^\/_next\/static\//, /^\/_next\/image/, /^\/icons\//, /^\/media\//];

self.addEventListener("install", (event) => {
  event.waitUntil(saveOfflinePage().then(() => self.skipWaiting()));
});

// The offline page is shown in place of pages that were never saved, at their address. It is saved
// as plain HTML without scripts (so the app doesn't try to start on the wrong page) plus its stylesheets.
async function saveOfflinePage() {
  const response = await fetch(OFFLINE_URL, { cache: "no-store" });
  const html = await response.text();
  const styles = [...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((m) => m[1]);
  await (await caches.open(ASSETS)).addAll([...new Set(styles)]);
  const staticHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<link[^>]+rel="(?:preload|modulepreload)"[^>]*as="script"[^>]*>/gi, "");
  await (await caches.open(PAGES)).put(OFFLINE_URL, new Response(staticHtml, { headers: { "content-type": "text/html; charset=utf-8" } }));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const savable = OFFLINE_PAGES.some((re) => re.test(url.pathname));
    event.respondWith(networkFirstPage(request, savable));
    return;
  }
  if (STATIC_ASSETS.some((re) => re.test(url.pathname))) {
    event.respondWith(cacheFirst(request));
  }
});

// Fresh page when online (and saved if it's a guide or forecast); the saved copy when offline.
async function networkFirstPage(request, savable) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (savable && response.ok && !response.redirected) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
