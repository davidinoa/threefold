import { betterAuth } from "better-auth"
import { env } from "cloudflare:workers"

import { authOptions } from "./options"
import { type Site, siteFor } from "./site"

function createAuth(site: Site) {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET isn't set. For local development, run pnpm dev-vars."
    )
  }
  return betterAuth({
    ...authOptions(site),
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
  })
}

// One Better Auth per site. Production and local development each have one
// (local has two ports); a preview has only its own.
const instances = new Map<string, ReturnType<typeof createAuth>>()

/**
 * Better Auth for the site a request came to, or nothing if this environment
 * doesn't serve it.
 */
export function authFor(request: Request) {
  const site = siteFor(env, request.url)
  if (!site) return undefined
  let auth = instances.get(site.origin)
  if (!auth) {
    auth = createAuth(site)
    instances.set(site.origin, auth)
  }
  return auth
}
