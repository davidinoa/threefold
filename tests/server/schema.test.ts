import { env } from "cloudflare:workers"
import { expect, it } from "vitest"

// Every column the server may store, table by table. A new column fails this
// test until it's listed here, so each one gets a review (system design §5.7).
const ALLOWED_COLUMNS: Record<string, string[]> = {
  // Better Auth's tables (migrations/0001_better_auth.sql). Some columns stay
  // empty, because Threefold signs in with passkeys only and stores nothing
  // that identifies anyone (N-5).
  account: [
    // Better Auth's, for passwords and social sign-in. No rows: passkeys
    // don't use it.
    "accessToken",
    "accessTokenExpiresAt",
    "accountId",
    "createdAt",
    "id",
    "idToken",
    "password",
    "providerId",
    "refreshToken",
    "refreshTokenExpiresAt",
    "scope",
    "updatedAt",
    "userId",
  ],
  passkey: [
    "aaguid",
    "backedUp",
    "counter",
    "createdAt",
    "credentialID",
    "deviceType",
    "id",
    // A coarse device label, such as "iPhone".
    "name",
    "publicKey",
    "transports",
    "userId",
  ],
  session: [
    "createdAt",
    "expiresAt",
    "id",
    // Always empty: IP tracking is off.
    "ipAddress",
    "token",
    "updatedAt",
    // Always empty: a hook drops it before the session is stored.
    "userAgent",
    "userId",
  ],
  user: [
    "createdAt",
    // A placeholder, <id>@users.invalid: Better Auth needs one.
    "email",
    "emailVerified",
    "id",
    // Always empty.
    "image",
    // A placeholder too: "Threefold".
    "name",
    "updatedAt",
  ],
  // Passkey challenges, each kept only until its ceremony finishes.
  verification: [
    "createdAt",
    "expiresAt",
    "id",
    "identifier",
    "updatedAt",
    "value",
  ],
}

it("stores only the columns on the allowlist", async () => {
  // D1's own tables and SQLite's are left out.
  const { results: tables } = await env.DB.prepare(
    `SELECT name FROM sqlite_schema
     WHERE type = 'table' AND name NOT GLOB 'sqlite_*'
       AND name NOT GLOB '_cf_*' AND name <> 'd1_migrations'
     ORDER BY name`
  ).all<{ name: string }>()

  const columns = await Promise.all(
    tables.map(async ({ name }) => {
      const { results } = await env.DB.prepare(
        "SELECT name FROM pragma_table_info(?) ORDER BY name"
      )
        .bind(name)
        .all<{ name: string }>()
      return [name, results.map((column) => column.name)] as const
    })
  )
  expect(Object.fromEntries(columns)).toEqual(ALLOWED_COLUMNS)
})
