/// <reference types="@cloudflare/vitest-plugin/types" />
import { type D1Migration, applyD1Migrations } from "cloudflare:test"
import { env } from "cloudflare:workers"
import { beforeAll, expect, it } from "vitest"

// Every column the server may store, table by table. A new column fails this
// test until it's listed here, so each one gets a review (system design §5.7).
// Better Auth's tables arrive with their migration.
const ALLOWED_COLUMNS: Record<string, string[]> = {}

// Read in Node, from migrations/ (vitest.config.ts).
const { TEST_MIGRATIONS } = env as Cloudflare.Env & {
  TEST_MIGRATIONS: D1Migration[]
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, TEST_MIGRATIONS)
})

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
