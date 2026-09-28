/**
 * Registers the service worker that keeps the app on the device, so it opens
 * with no connection (system design §2.6). Only the build has one: in
 * development, Vite serves every file fresh.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
  // A browser can refuse, in a private window for example. The app still
  // works online.
  void navigator.serviceWorker.register("/sw.js").catch(() => undefined)
}
