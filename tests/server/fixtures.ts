import { betterAuth } from "better-auth"
import { testUtils } from "better-auth/plugins"
import { env } from "cloudflare:workers"

import { authOptions } from "@/lib/auth/options"
import { siteFor } from "@/lib/auth/site"

/** Where server tests send requests: local development's first origin. */
export const ORIGIN = "http://localhost:3000"

/**
 * Signs a new user in through Better Auth's own server API, and returns the
 * headers that carry the session. It uses a test-only Better Auth with the
 * Worker's options, database, and secret, so no test-only route ships.
 */
export async function signIn() {
  const site = siteFor(env, ORIGIN)
  if (!site) throw new Error(`Local config doesn't serve ${ORIGIN}`)
  const options = authOptions(site)
  const auth = betterAuth({
    ...options,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    plugins: [...options.plugins, testUtils()],
  })
  const { test } = await auth.$context
  const user = await test.saveUser(
    test.createUser({
      email: `${crypto.randomUUID()}@users.invalid`,
      name: "Threefold",
    })
  )
  const { headers } = await test.login({ userId: user.id })
  return { user, headers }
}
