import type { APIContext } from 'astro';

export async function GET(_context: APIContext) {
  const base = import.meta.env.BASE_URL;
  const code = `
const CACHE = 'blog-v2';
const BASE = ${JSON.stringify(base)};

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== location.origin) return;
  // 不缓存音频流与后台 API
  if (url.pathname.includes('/music/audio/') || url.pathname.includes('/api/')) return;
  if (!url.pathname.startsWith(BASE) && url.pathname !== BASE.replace(/\\/$/, '')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const update = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || update;
    }),
  );
});
`;
  return new Response(code, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
  });
}
