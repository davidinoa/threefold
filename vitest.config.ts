import { existsSync } from "node:fs"

import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import { configDefaults, defineConfig, mergeConfig } from "vitest/config"

import storybookVite from "./.storybook/vite.config"

// Vitest searches hidden folders, so without this every project would also
// run the copies in agents' worktrees under .claude/.
const exclude = [...configDefaults.exclude, ".claude/**"]

// Tests get a config of their own, so the app's Vite config, with Start's and
// Cloudflare's plugins, never loads in them.
export default defineConfig({
  test: {
    projects: [
      // Seam 2: the jar's rules, as pure functions, in Node.
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "rules",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude,
        },
      },
      // Seam 3: the server's API, over HTTP, in the Workers runtime with a
      // local D1. It tests the Worker as built, which is what ships, so the
      // test script builds first.
      {
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: "./dist/server/wrangler.json" },
            // The D1 migrations, for the tests to apply. The folder appears
            // with the first one, Better Auth's tables.
            miniflare: {
              bindings: {
                TEST_MIGRATIONS: existsSync("migrations")
                  ? await readD1Migrations("migrations")
                  : [],
              },
            },
          })),
        ],
        test: {
          name: "server",
          include: ["tests/server/**/*.test.ts"],
          exclude,
        },
      },
      // Every story runs as a test in Chromium, on Storybook's own Vite
      // config: React and Tailwind only.
      mergeConfig(storybookVite, {
        plugins: [storybookTest({ configDir: ".storybook" })],
        test: {
          name: "storybook",
          exclude,
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
