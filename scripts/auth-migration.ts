import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"

import { getMigrations } from "better-auth/db/migration"

import { authOptions } from "../src/lib/auth/options.ts"

// Writes Better Auth's tables as the next D1 migration (ADR 0001). Better
// Auth can't open a D1 binding from Node, so it works out its SQL against
// SQLite in memory, after replaying migrations/, and writes only what's
// missing. Run it after upgrading Better Auth or changing its options, then
// review the SQL and add its columns to the schema allowlist.

const dir = "migrations"
mkdirSync(dir, { recursive: true })
const applied = readdirSync(dir)
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .toSorted()

const database = new DatabaseSync(":memory:")
for (const file of applied) database.exec(readFileSync(join(dir, file), "utf8"))

// The site changes Better Auth's behavior, not its tables, so any will do.
const site = {
  rpID: "localhost",
  origin: "http://localhost:3000",
  origins: ["http://localhost:3000"],
}
const plan = await getMigrations({
  ...authOptions(site),
  // Signs nothing: this only reads the schema.
  secret: "generating-migrations-only-not-a-real-secret",
  database,
})

if (
  plan.toBeCreated.length === 0 &&
  plan.toBeAdded.length === 0 &&
  plan.toBeAddedIndexes.length === 0
) {
  console.log("Better Auth's tables are up to date.")
} else {
  const last = applied.at(-1)?.slice(0, 4) ?? "0000"
  const next = String(Number(last) + 1).padStart(4, "0")
  const file = join(dir, `${next}_better_auth.sql`)
  const sql = await plan.compileMigrations()
  writeFileSync(
    file,
    `-- Better Auth's tables, written by pnpm auth:migration.\n${sql}\n`
  )
  console.log(
    `Wrote ${file}. Review it, and add its columns to the schema allowlist.`
  )
}
