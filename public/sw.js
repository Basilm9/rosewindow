/* Rose Window's own app shell only: never cache cross-origin requests or user data. */
const CACHE_PREFIX = 'rosewindow-cache-'
const CACHE_NAME = `${CACHE_PREFIX}v1`
const APP_ROOT = new URL('./', self.registration.scope)
const INDEX_URL = new URL('index.html', APP_ROOT).href
const STATIC_FILES = ['icon.svg', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']
const STATIC_PATHS = new Set(STATIC_FILES.map((file) => new URL(file, APP_ROOT).pathname))
const ASSET_PATH = new URL('assets/', APP_ROOT).pathname

function isAppDocument(url) {
  return url.pathname === APP_ROOT.pathname || url.pathname === new URL(INDEX_URL).pathname
}

function isBuildAsset(url) {
  return url.pathname.startsWith(ASSET_PATH) && /\.(?:js|css|svg|png|webp|avif|woff2?)$/i.test(url.pathname)
}

function cacheable(response) {
  return response.ok && response.type === 'basic'
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    const indexResponse = await fetch(INDEX_URL, { cache: 'reload' })
    if (!cacheable(indexResponse)) throw new Error('The Rose Window app shell is unavailable')

    // The first page loaded before this worker existed. Discover its hashed
    // production bundles now so that this very first visit works offline too.
    const html = await indexResponse.clone().text()
    const assets = new Set(STATIC_FILES.map((file) => new URL(file, APP_ROOT).href))
    for (const match of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const url = new URL(match[1], INDEX_URL)
      if (url.origin === APP_ROOT.origin && isBuildAsset(url)) assets.add(url.href)
    }
    await cache.addAll([...assets].map((url) => new Request(url, { cache: 'reload' })))
    await cache.put(INDEX_URL, indexResponse)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== APP_ROOT.origin) return

  if (request.mode === 'navigate' && isAppDocument(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME)
      try {
        const response = await fetch(request)
        if (cacheable(response)) await cache.put(INDEX_URL, response.clone())
        if (response.ok) return response
        return (await cache.match(INDEX_URL)) ?? response
      } catch {
        return (await cache.match(INDEX_URL)) ?? Response.error()
      }
    })())
    return
  }

  // Only versioned production assets and the explicit installation files.
  // API routes, challenge payloads, arbitrary pages, and third-party content
  // are deliberately outside this worker's cache.
  if (!isBuildAsset(url) && !STATIC_PATHS.has(url.pathname)) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    // Module scripts carry an Origin header while installation fetches may not.
    // These allowlisted public files have identical bytes in either case, even
    // when the static host adds Vary: Origin to every response.
    const cached = await cache.match(request, { ignoreVary: true })
    if (cached) return cached
    const response = await fetch(request)
    if (cacheable(response)) await cache.put(request, response.clone())
    return response
  })())
})
