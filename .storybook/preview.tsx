import { withThemeByClassName } from "@storybook/addon-themes"
import type { Decorator, Preview } from "@storybook/react-vite"
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
    <MotionConfig
      reducedMotion={globals.motion === "reduced" ? "always" : "user"}
    >
      {mode === "Side by side" ? (
        <div className="grid min-h-svh grid-cols-2">
          <div className="bg-background paper-grain p-6 text-foreground">
            {copy(false)}
          </div>
          <div className="dark bg-background paper-grain p-6 text-foreground">
            {copy(true)}
          </div>
        </div>
      ) : (
        <div className="min-h-svh bg-background paper-grain p-6 text-foreground">
          {copy(mode === "Night")}
        </div>
      )}
    </MotionConfig>
  )
}

const preview: Preview = {
  decorators: [
    withThreefold,
    withThemeByClassName({
      themes: { Day: "", Night: "dark", "Side by side": "" },
      defaultTheme: "Day",
    }),
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
