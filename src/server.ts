import handler, { createServerEntry } from "@tanstack/react-start/server-entry"
import { env } from "cloudflare:workers"

// Static files never reach the Worker: Cloudflare serves them first. Every
// other page request gets the prerendered shell, byte for byte, so its CSP
// hashes can come from the build. The API and server functions go to Start,
// and so do pages while the shell doesn't exist yet: in dev, and during the
// build's prerender, which creates it.
export default createServerEntry({
  async fetch(request, ...rest) {
    const { pathname } = new URL(request.url)
    const isPage =
      (request.method === "GET" || request.method === "HEAD") &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/_serverFn/")
    if (isPage) {
      const shell = await env.ASSETS.fetch(new URL("/_shell.html", request.url))
      if (shell.ok) return shell
    }
    return handler.fetch(request, ...rest)
  },
})
