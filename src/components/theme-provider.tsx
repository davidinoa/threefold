// src/components/theme-provider.tsx: shadcn's TanStack Start recipe, plus resolvedTheme and forcedTheme
import { createContext, use, useMemo, useSyncExternalStore } from "react"

export type Theme = "light" | "dark" | "system"
type ThemeState = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const KEY = "theme"
const DARK = "(prefers-color-scheme: dark)"
// The browser's bars take the page's color: the --background tokens in
// src/styles.css, in hex. The manifest has Day's too.
const BARS = { light: "#f8f3ea", dark: "#111127" }

// Runs before first paint and before hydration, so the right palette is there from the first frame.
// The root route renders it with <ScriptOnce>, so this file never imports the router.
// It adds the theme-color tag itself, so React never renders one that differs from the page.
export const themeScript = `(function () { try {
  var t = localStorage.getItem("${KEY}") || "system"
  var d = t === "dark" || (t === "system" && matchMedia("${DARK}").matches)
  document.documentElement.classList.toggle("dark", d)
  document.documentElement.style.colorScheme = d ? "dark" : "light"
  var m = document.querySelector('meta[name="theme-color"]')
  if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m) }
  m.content = d ? "${BARS.dark}" : "${BARS.light}"
} catch (e) {} })()`

const listeners = new Set<() => void>()
const systemDark = () => matchMedia(DARK).matches

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === "light" || t === "dark" ? t : "system"
  } catch {
    return "system"
  }
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemDark())
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
  let bars = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!bars) {
    bars = document.createElement("meta")
    bars.name = "theme-color"
    document.head.appendChild(bars)
  }
  bars.content = dark ? BARS.dark : BARS.light
}

function subscribe(onChange: () => void) {
  const sync = () => {
    apply(readTheme()) // the device flipped, or another tab chose
    onChange()
  }
  const mq = matchMedia(DARK)
  listeners.add(onChange)
  mq.addEventListener("change", sync)
  window.addEventListener("storage", sync)
  return () => {
    listeners.delete(onChange)
    mq.removeEventListener("change", sync)
    window.removeEventListener("storage", sync)
  }
}

const ThemeContext = createContext<ThemeState | null>(null)

export function ThemeProvider({
  children,
  forcedTheme,
}: {
  children: React.ReactNode
  forcedTheme?: "light" | "dark"
}) {
  const stored = useSyncExternalStore(
    subscribe,
    readTheme,
    (): Theme => "system"
  ) // the server can't know
  const dark = useSyncExternalStore(subscribe, systemDark, () => false)
  const theme = forcedTheme ?? stored // forcedTheme: Storybook's toolbar decides
  const resolvedTheme = theme === "system" ? (dark ? "dark" : "light") : theme

  const value = useMemo<ThemeState>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next) => {
        if (forcedTheme) return
        try {
          localStorage.setItem(KEY, next)
        } catch {}
        apply(next)
        listeners.forEach((l) => l())
      },
    }),
    [theme, resolvedTheme, forcedTheme]
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const ctx = use(ThemeContext)
  if (!ctx) throw new Error("useTheme needs a <ThemeProvider> above it")
  return ctx
}
