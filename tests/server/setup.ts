/// <reference types="@cloudflare/vitest-plugin/types" />
import { type D1Migration, applyD1Migrations } from "cloudflare:test"
import { env } from "cloudflare:workers"
import { beforeAll } from "vitest"

// Every server test runs against a local D1 with the migrations applied. They
// were read in Node, from migrations/ (vitest.config.ts).
const { TEST_MIGRATIONS } = env as Cloudflare.Env & {
  TEST_MIGRATIONS: D1Migration[]
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, TEST_MIGRATIONS)
})
