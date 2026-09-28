import { createFileRoute } from "@tanstack/react-router"

import { authFor } from "@/lib/auth/auth.server"

// Better Auth's own routes: passkey sign-up and sign-in, sessions, and passkey
// management (ADR 0001, system design §4.1). It checks each body itself.
function handle({ request }: { request: Request }) {
  const auth = authFor(request)
  return auth ? auth.handler(request) : new Response(null, { status: 404 })
}

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handle, POST: handle } },
})
