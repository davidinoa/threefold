import handler, { createServerEntry } from "@tanstack/react-start/server-entry"
import { env } from "cloudflare:workers"

// A "sha256-…" hash for each inline script in the shell, separated by spaces.
// The shell only exists once Start prerenders it, after this file is built,
// so the build writes them in then (shellScriptHashes in vite.config.ts).
const SHELL_SCRIPT_HASHES = "__SHELL_SCRIPT_HASHES__"

// The shell's Content-Security-Policy (system design §5.7). Nothing may load
// from another origin, and the only scripts that run are the app's own files
// and the shell's inline scripts, each named by its hash.
const SHELL_CSP = [
  "default-src 'self'",
  ["script-src 'self'"]
    .concat(SHELL_SCRIPT_HASHES.split(" ").map((hash) => `'${hash}'`))
    .join(" "),
  // sonner inserts a <style> element of its own, with no way to pass it a
  // nonce or a hash.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

// On everything the Worker answers.
const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  // Passkeys, and the motion sensors that shake reads. Features the app
  // doesn't use are turned off.
  "Permissions-Policy": [
    "publickey-credentials-create=(self)",
    "publickey-credentials-get=(self)",
    "accelerometer=(self)",
    "gyroscope=(self)",
    "bluetooth=()",
    "camera=()",
    "display-capture=()",
    "geolocation=()",
    "hid=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "payment=()",
    "serial=()",
    "usb=()",
  ].join(", "),
}

function withHeaders(response: Response, headers: Record<string, string>) {
  const secured = new Response(response.body, response)
  for (const [name, value] of Object.entries(headers)) {
    secured.headers.set(name, value)
  }
  return secured
}

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
      if (shell.ok) {
        return withHeaders(shell, {
          ...SECURITY_HEADERS,
          "Content-Security-Policy": SHELL_CSP,
        })
      }
    }
    return withHeaders(await handler.fetch(request, ...rest), SECURITY_HEADERS)
  },
})
