// Minimal service worker for offline fallback and basic caching
const CACHE_NAME = 'tradieday-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll([
      '/',
      OFFLINE_URL,
      '/manifest.json',
    ])
    self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // cleanup old caches
    const keys = await caches.keys()
    await Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k) }))
    self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith((async () => {
    try {
      const networkResponse = await fetch(event.request)
      return networkResponse
    } catch (err) {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(event.request) || await cache.match(OFFLINE_URL)
      return cached
    }
  })())
})
