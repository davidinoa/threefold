import { test as base, expect } from "@playwright/test"

type CspReporter = { reportCspViolation(violation: string): Promise<void> }

// Guards on every test (PRD, Testing Decisions): nothing may load from
// another origin, and nothing may break the Content-Security-Policy. A test
// that breaks the CSP on purpose checks guards.cspViolations, then empties it.
export const test = base.extend<{ guards: { cspViolations: string[] } }>({
  guards: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL ?? "http://localhost").origin
      const otherOrigins: string[] = []
      page.on("request", (request) => {
        const url = new URL(request.url())
        if (url.protocol.startsWith("http") && url.origin !== origin) {
          otherOrigins.push(url.href)
        }
      })

      const cspViolations: string[] = []
      await page.exposeFunction("reportCspViolation", (violation: string) => {
        cspViolations.push(violation)
      })
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (event) => {
          void (window as unknown as CspReporter).reportCspViolation(
            `${event.violatedDirective}: ${event.blockedURI}`
          )
        })
      })

      await use({ cspViolations })

      expect(otherOrigins, "requests to other origins").toEqual([])
      expect(cspViolations, "Content-Security-Policy violations").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
