// Writes .dev.vars, the Worker's local vars and secrets, from
// .dev.vars.example, with a new BETTER_AUTH_SECRET. It leaves an existing
// .dev.vars alone. CI runs it too, so every run gets a secret of its own.
import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

if (existsSync(".dev.vars")) {
  console.log(".dev.vars already exists, so it's unchanged.")
} else {
  const secret = randomBytes(32).toString("base64")
  const vars = readFileSync(".dev.vars.example", "utf8").replace(
    /^BETTER_AUTH_SECRET=.*$/m,
    `BETTER_AUTH_SECRET=${secret}`
  )
  writeFileSync(".dev.vars", vars, { mode: 0o600 })
  console.log("Wrote .dev.vars, with a new BETTER_AUTH_SECRET.")
}
