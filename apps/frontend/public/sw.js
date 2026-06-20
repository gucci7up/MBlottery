/**
 * Service Worker — Modo Offline para POS
 * Estrategias:
 *   - Cache First: assets estáticos (JS, CSS, imágenes)
 *   - Network First con fallback: API de sorteos abiertos
 *   - Background Sync: tickets creados offline
 */

const CACHE_NAME = 'sistema-banca-v1';
const API_CACHE = 'api-cache-v1';
const SYNC_TAG = 'sync-tickets';

const STATIC_ASSETS = [
  '/',
  '/index.html',
];

const CACHEABLE_API = [
  '/api/draws/open',
  '/api/lottery-providers',
  '/auth/me',
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests no-GET excepto /api/tickets (POST → background sync)
  if (request.method === 'POST' && url.pathname === '/api/tickets') {
    event.respondWith(handleOfflineTicket(request));
    return;
  }

  if (request.method !== 'GET') return;

  // API cacheable: Network First con fallback a cache
  if (CACHEABLE_API.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Assets estáticos: Cache First
  if (url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // SPA: siempre devolver index.html para rutas frontend
  if (!url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match('/index.html').then((r) => r ?? fetch(request)),
    );
  }
});

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function handleOfflineTicket(request) {
  try {
    return await fetch(request);
  } catch {
    // Guardar en IndexedDB para sync posterior
    const body = await request.clone().json();
    await saveOfflineTicket({ ...body, _offlineId: crypto.randomUUID(), _createdAt: new Date().toISOString() });

    // Registrar background sync
    if (self.registration.sync) {
      await self.registration.sync.register(SYNC_TAG);
    }

    return new Response(
      JSON.stringify({ offline: true, message: 'Ticket guardado. Se sincronizará al recuperar conexión.' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// ─── Background Sync ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncOfflineTickets());
  }
});

async function syncOfflineTickets() {
  const tickets = await getOfflineTickets();
  for (const ticket of tickets) {
    try {
      const { _offlineId, _createdAt, ...payload } = ticket;
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok || res.status === 409) {
        await removeOfflineTicket(_offlineId);
      }
    } catch {
      // Intentar de nuevo en el próximo sync
    }
  }
}

// ─── IndexedDB helpers ───────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('offline-pos', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('tickets', { keyPath: '_offlineId' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOfflineTicket(ticket) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tickets', 'readwrite');
    tx.objectStore('tickets').put(ticket);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function getOfflineTickets() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tickets', 'readonly');
    const req = tx.objectStore('tickets').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeOfflineTicket(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tickets', 'readwrite');
    tx.objectStore('tickets').delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
