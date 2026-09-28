/// <reference lib="webworker" />
// The offline shell's service worker (system design §2.6). The build compiles
// it to /sw.js and writes in what to precache.

import { isServerPath } from "@/lib/server-paths"

declare const self: ServiceWorkerGlobalScope
/** The shell, as "/", and the files the app needs offline. */
declare const __PRECACHE__: string[]
/** A hash of everything in the precache, so each build gets its own cache. */
declare const __VERSION__: string

const CACHE = `threefold-${__VERSION__}`
const PRECACHE = __PRECACHE__
const PRECACHED = new Set(PRECACHE)

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          PRECACHE.map((path) => new Request(path, { cache: "reload" }))
        )
      )
  )
})

// A new version waits until no tab uses the old one, so it takes over at the
// next launch, and then drops the old version's cache.
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("threefold-") && name !== CACHE)
            .map((name) => caches.delete(name))
        )
      )
  )
})

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== "GET" || url.origin !== self.location.origin) return
  // The server's own paths are never cached: always the network's answer.
  if (isServerPath(url.pathname)) return

  // Every page is the same shell, whatever its path: the router takes it from
  // there.
  if (request.mode === "navigate") {
    event.respondWith(fromCache("/", request))
  } else if (PRECACHED.has(url.pathname)) {
    event.respondWith(fromCache(url.pathname, request))
  }
})

async function fromCache(path: string, request: Request) {
  const cache = await caches.open(CACHE)
  return (await cache.match(path)) ?? fetch(request)
}
