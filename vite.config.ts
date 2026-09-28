import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFile, readdir, writeFile } from "node:fs/promises"
import { join, relative, resolve } from "node:path"

import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { type Plugin, type ViteBuilder, build, defineConfig } from "vite"

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
    // Last, so they run after Start's prerender.
    shellScriptHashes(),
    serviceWorker(),
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

/** The folder a build environment writes to. */
function outDir(builder: ViteBuilder, name: string) {
  const environment = builder.environments[name]
  if (!environment) throw new Error(`No "${name}" build environment`)
  return resolve(builder.config.root, environment.config.build.outDir)
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
        const shell = await readFile(
          join(outDir(builder, "client"), "_shell.html"),
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

        const serverDir = outDir(builder, "ssr")
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

// The design subsets the fonts to Latin (system design §5.5), so the service
// worker skips the files Fontsource adds for other scripts. Their names say
// which.
const OTHER_SCRIPTS =
  /-(latin-ext|cyrillic|cyrillic-ext|greek|greek-ext|vietnamese|math)-/

/** Whether the service worker saves a file from the client build. */
function isPrecached(file: string) {
  if (["_shell.html", "sw.js", "robots.txt"].includes(file)) return false
  if (file.split("/").some((part) => part.startsWith("."))) return false
  if (file.endsWith(".map")) return false
  return !(file.endsWith(".woff2") && OTHER_SCRIPTS.test(file))
}

/**
 * Compiles src/sw.ts to /sw.js, with the files it precaches (system design
 * §2.6). The list comes from the finished client build, so this runs after
 * Start's prerender too. The shell is saved as /, which the Worker answers
 * with it, because Cloudflare redirects a request for /_shell.html.
 */
function serviceWorker(): Plugin {
  return {
    name: "threefold:service-worker",
    enforce: "post",
    buildApp: {
      order: "post",
      async handler(builder) {
        const clientDir = outDir(builder, "client")
        const entries = await readdir(clientDir, {
          recursive: true,
          withFileTypes: true,
        })
        const files = entries
          .filter((entry) => entry.isFile())
          .map((entry) =>
            relative(clientDir, join(entry.parentPath, entry.name))
          )
          .filter((file) => isPrecached(file))
          .toSorted()

        // A change to any saved file, the shell included, makes a new sw.js,
        // which the browser installs as a new version with its own cache.
        const version = createHash("sha256")
        for (const file of ["_shell.html", ...files]) {
          version.update(file).update(await readFile(join(clientDir, file)))
        }

        await build({
          configFile: false,
          root: builder.config.root,
          logLevel: "warn",
          resolve: { tsconfigPaths: true },
          define: {
            __PRECACHE__: JSON.stringify([
              "/",
              ...files.map((file) => `/${file}`),
            ]),
            __VERSION__: JSON.stringify(version.digest("hex").slice(0, 12)),
          },
          build: {
            outDir: clientDir,
            emptyOutDir: false,
            copyPublicDir: false,
            minify: true,
            // A classic script, which every browser runs as a service worker.
            lib: {
              entry: resolve(builder.config.root, "src/sw.ts"),
              formats: ["iife"],
              name: "threefoldServiceWorker",
              fileName: () => "sw.js",
            },
          },
        })
      },
    },
  }
}
