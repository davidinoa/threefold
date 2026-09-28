import { createRouter as createTanStackRouter } from "@tanstack/react-router"

import { installErrorReporting, reportCaughtError } from "@/lib/error-reports"
import { registerServiceWorker } from "@/lib/service-worker"

import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Errors a route's error boundary catches never reach the window.
    defaultOnCatch: reportCaughtError,
  })

  // The prerender runs this on the server, where there's nothing to report
  // and no service worker.
  if (typeof window !== "undefined") {
    installErrorReporting(
      () => router.state.matches.at(-1)?.routeId ?? "unknown"
    )
    registerServiceWorker()
  }

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
