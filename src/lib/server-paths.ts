// The server's own paths: the API and Start's server functions. Every other
// path is a page of the app, which gets the shell (system design §2.2), from
// the Worker or, once it's saved, from the service worker (§2.6).
const SERVER_PATHS = ["/api/", "/_serverFn/"]

/** Whether a path belongs to the server rather than to a page of the app. */
export function isServerPath(pathname: string): boolean {
  return SERVER_PATHS.some((prefix) => pathname.startsWith(prefix))
}
