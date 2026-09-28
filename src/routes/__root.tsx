import { TanStackDevtools } from "@tanstack/react-devtools"
import {
  ClientOnly,
  HeadContent,
  ScriptOnce,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { MotionConfig } from "motion/react"

import { ThemeProvider, themeScript } from "@/components/theme-provider"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Threefold" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: the theme script sets .dark before React hydrates */}
      <head>
        <HeadContent />
      </head>
      <body className="paper-grain">
        <ScriptOnce>{themeScript}</ScriptOnce>
        <ThemeProvider>
          <MotionConfig reducedMotion="user">
            {/* The shell leaves the page area empty, but the client can fill
                it on its first pass, which fails hydration with React #418
                (TanStack/router#8473). Rendering it only after hydration
                matches the shell at every address. Nothing here is
                server-rendered anyway: it's a single-page app. */}
            <ClientOnly>{children}</ClientOnly>
          </MotionConfig>
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
