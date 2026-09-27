# Storybook for the design system

The design system is documented in its own Storybook, deployed as a second Worker (system design §2.9).

An earlier setup ran Storybook on `@storybook/tanstack-react`, pinned to an older TanStack Router (storybookjs/storybook#36330). That no longer applies:

- The design system doesn't use TanStack Router. Links come in through Base UI's `render` prop, and data comes in as props.
- So Storybook runs on plain `@storybook/react-vite`.
- It has a Vite config of its own that loads only React and Tailwind. Start's and Cloudflare's plugins never load in Storybook, and no TanStack package gets pinned.

This setup hasn't run in this exact form yet. The Storybook spike (system design §6, question 5) checks it at setup.

## Versions to start from

| Package | Version |
|---|---|
| storybook, @storybook/react-vite, @storybook/addon-docs, @storybook/addon-a11y, @storybook/addon-themes, @storybook/addon-vitest | 10.6.0 |
| storybook-addon-pseudo-states | 10.6.0 |
| @fontsource-variable/figtree, kalnia, shantell-sans | 5.3.0 |

React, Tailwind, motion, and Vite come from the app, at whatever versions the setup pins.

## Setup

Run `pnpm create storybook@latest`, choose React with Vite, and delete the example stories it adds in `src/stories/`.

## .storybook/main.ts

```ts
import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.{ts,tsx}"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
    "storybook-addon-pseudo-states",
  ],
  framework: "@storybook/react-vite",
  core: {
    builder: {
      name: "@storybook/builder-vite",
      // Storybook's own Vite config: React and Tailwind only. The spike confirms which folder this path resolves from.
      options: { viteConfigPath: ".storybook/vite.config.ts" },
    },
  },
}
export default config
```

Write the story glob as `{ts,tsx}`. Storybook's usual `@(ts|tsx)` form silently matches nothing in oxlint.

## .storybook/vite.config.ts

```ts
import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Only what the design system needs: no TanStack Start, no Cloudflare plugin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
})
```

## .storybook/preview.tsx

```tsx
import type { Decorator, Preview } from "@storybook/react-vite"
import { withThemeByClassName } from "@storybook/addon-themes"
import { LayoutGroup, MotionConfig } from "motion/react"
import { ThemeProvider } from "../src/components/theme-provider"
import "../src/styles.css"

// Day and Night flip .dark on <html>. Side by side renders the story twice, the second copy in a .dark wrapper.
const withThreefold: Decorator = (Story, { globals }) => {
  const mode = (globals.theme as string | undefined) ?? "Day"
  const copy = (dark: boolean) => (
    <ThemeProvider forcedTheme={dark ? "dark" : "light"}>
      <LayoutGroup id={dark ? "night" : "day"}>
        <Story />
      </LayoutGroup>
    </ThemeProvider>
  )
  return (
    <MotionConfig reducedMotion={globals.motion === "reduced" ? "always" : "user"}>
      {mode === "Side by side" ? (
        <div className="grid min-h-svh grid-cols-2">
          <div className="paper-grain bg-background p-6 text-foreground">{copy(false)}</div>
          <div className="dark paper-grain bg-background p-6 text-foreground">{copy(true)}</div>
        </div>
      ) : (
        <div className="paper-grain min-h-svh bg-background p-6 text-foreground">{copy(mode === "Night")}</div>
      )}
    </MotionConfig>
  )
}

const preview: Preview = {
  decorators: [
    withThreefold,
    withThemeByClassName({ themes: { Day: "", Night: "dark", "Side by side": "" }, defaultTheme: "Day" }),
  ],
  globalTypes: {
    motion: {
      description: "Reduced motion",
      toolbar: {
        title: "Motion",
        icon: "play",
        items: [
          { value: "full", title: "Full motion" },
          { value: "reduced", title: "Reduced motion" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { motion: "full" },
  // The a11y addon only warns by default ("todo"). "error" makes a violation fail the story's test.
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
}
export default preview
```

- **One `ThemeProvider` per copy.** Each copy gets its own, with `forcedTheme`, so the components that call `useTheme()` match the copy they're in. Those are the NightToggle, the Toaster, and the theme's SegmentedControl. Their own `setTheme` does nothing in Storybook, because the toolbar decides.
- **One `LayoutGroup` per copy,** so shared `layoutId`s, like the nav swash, don't fly between the Day and Night copies.
- **The Motion toggle covers only motion's JavaScript animations.** CSS animations follow the operating system's reduced-motion setting, so check those with the browser's rendering emulation.

## Links in stories

Components never import the router. A link comes in as an element, and the component renders it with Base UI's `useRender`, styled with `buttonVariants()` when it should look like a button. It never goes through Button, which would announce it as a button. So a story passes a plain anchor:

```tsx
// src/components/threefold/day-status.stories.tsx
import type { Meta, StoryObj } from "@storybook/react-vite"
import { DayStatus } from "./day-status"

const meta = { title: "Today/DayStatus", component: DayStatus } satisfies Meta<typeof DayStatus>
export default meta
type Story = StoryObj<typeof meta>

// In the app, the screen passes TanStack Router's <Link to="/review" /> instead.
export const Done: Story = {
  args: {
    folded: 3, round: 0, category: "talents", weekday: "Wednesday", tomorrow: "luck",
    reviewCount: 14, reviewLink: <a href="/review" />, onAnother: () => {},
  },
}
```

Whether a tab is current comes in as a prop too, so a story shows any state without a route.

A story can also pin the theme, or force a pseudo-state:

```tsx
export const Night: Story = { globals: { theme: "Night" } }
export const FocusVisible: Story = { parameters: { pseudo: { focusVisible: true } } }
```

`storybook-addon-pseudo-states` handles Tailwind v4's variants, including `pointer-fine:hover:` and `focus-visible:`.

## Stories are tests

- **How they run:** Storybook's Vitest addon runs every story as a test, in Vitest's browser mode on Playwright's Chromium. CI's `test` job installs Chromium first, with `pnpm exec playwright install --with-deps chromium`.
- **Accessibility:** with `a11y: { test: "error" }`, an accessibility violation fails the story.

## Lint and types

- Add the Storybook folder to `tsconfig.json`'s `include`, as `".storybook/*.ts"` and `".storybook/*.tsx"`, so `main.ts`, `vite.config.ts`, and `preview.tsx` get type-checked with everything else.
- Add `storybook-static` to `.gitignore`, and to oxlint's and oxfmt's `ignorePatterns`.
- There are no route stubs to add. Stories never touch the route tree, because the design system never imports the router.
