import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import { configDefaults, defineConfig, mergeConfig } from "vitest/config"

import storybookVite from "./.storybook/vite.config"

// Tests get a config of their own, so the app's Vite config, with Start's and
// Cloudflare's plugins, never loads in them.
export default defineConfig({
  test: {
    projects: [
      // Every story runs as a test in Chromium, on Storybook's own Vite
      // config: React and Tailwind only.
      mergeConfig(storybookVite, {
        plugins: [storybookTest({ configDir: ".storybook" })],
        test: {
          name: "storybook",
          // Vitest searches hidden folders, so without this it would also
          // run the copies in agents' worktrees under .claude/.
          exclude: [...configDefaults.exclude, ".claude/**"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      }),
    ],
  },
})
