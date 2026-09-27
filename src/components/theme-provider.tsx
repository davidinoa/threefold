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

// Runs before first paint and before hydration, so the right palette is there from the first frame.
// The root route renders it with <ScriptOnce>, so this file never imports the router.
export const themeScript = `(function () { try {
  var t = localStorage.getItem("${KEY}") || "system"
  var d = t === "dark" || (t === "system" && matchMedia("${DARK}").matches)
  document.documentElement.classList.toggle("dark", d)
  document.documentElement.style.colorScheme = d ? "dark" : "light"
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
