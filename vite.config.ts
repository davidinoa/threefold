import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    // A single-page app: the build emits one static shell, /_shell.html, and
    // server routes serve the API (system design §2.2).
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
  ],
})

export default config
