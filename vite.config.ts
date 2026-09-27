import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Every page the server renders is the SPA shell. Start defines this in
  // dev; the build needs it too, because the Workers runtime can't see the
  // build's environment (TanStack/router#7740).
  define: {
    "process.env.TSS_SHELL": JSON.stringify("true"),
    "import.meta.env.TSS_SHELL": JSON.stringify("true"),
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
  ],
})

export default config
