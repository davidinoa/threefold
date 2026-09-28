import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFile, readdir, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"

import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { type Plugin, defineConfig } from "vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    // Every page the server renders is the SPA shell. Start defines this in
    // dev; the build needs it too, because the Workers runtime can't see the
    // build's environment (TanStack/router#7740).
    "process.env.TSS_SHELL": JSON.stringify("true"),
    "import.meta.env.TSS_SHELL": JSON.stringify("true"),
    // Error reports name the build they came from (system design §4.3).
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(buildId()),
  },
  plugins: [
    // devtools' sub-plugins all use enforce: "pre", so it stays first.
    devtools(),
    // The server runs in the Workers runtime, in development and in the build.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    // A single-page app: the build emits one static shell, /_shell.html, and
    // server routes serve the API (system design §2.2).
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
    // Last, so it runs after Start's prerender.
    shellScriptHashes(),
  ],
})

export default config

/** The short hash of the commit being built, or "dev" outside a git checkout. */
function buildId() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return "dev"
  }
}

// src/server.ts holds this until the build writes in the hashes. The bundler
// may move it into another string, so the hashes go in bare: base64 and
// spaces are safe inside any kind of quotes.
const HASHES_PLACEHOLDER = /__SHELL_SCRIPT_HASHES__/g

/**
 * Names each inline script in the shell by its hash, in the built Worker's
 * Content-Security-Policy (system design §5.7). The router's state script
 * changes on every build, so the hashes can only come from the finished shell,
 * which Start prerenders after the Worker is built.
 */
function shellScriptHashes(): Plugin {
  return {
    name: "threefold:shell-script-hashes",
    enforce: "post",
    buildApp: {
      order: "post",
      async handler(builder) {
        const outDir = (name: string) => {
          const environment = builder.environments[name]
          if (!environment) throw new Error(`No "${name}" build environment`)
          return resolve(builder.config.root, environment.config.build.outDir)
        }

        const shell = await readFile(
          join(outDir("client"), "_shell.html"),
          "utf8"
        )
        const hashes = [
          ...shell.matchAll(
            /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g
          ),
        ].map(([, script]) => {
          // The browser hashes the script as the HTML parser reads it, which
          // turns CR LF into LF and NUL into U+FFFD. The router's state
          // script has NULs: they separate its match ids.
          const parsed = script.replaceAll(/\r\n?/g, "\n").replaceAll("\0", "�")
          const hash = createHash("sha256").update(parsed).digest("base64")
          return `sha256-${hash}`
        })

        const serverDir = outDir("ssr")
        const files = await readdir(serverDir, { recursive: true })
        let written = 0
        for (const file of files.filter((name) => name.endsWith(".js"))) {
          const path = join(serverDir, file)
          const code = await readFile(path, "utf8")
          const filled = code.replaceAll(HASHES_PLACEHOLDER, () => {
            written += 1
            return hashes.join(" ")
          })
          if (filled !== code) await writeFile(path, filled)
        }
        if (written === 0) {
          throw new Error(
            "The built Worker has no place for the shell's script hashes"
          )
        }
      },
    },
  }
}
