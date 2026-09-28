import { test as base, expect } from "@playwright/test"

type CspReporter = { reportCspViolation(violation: string): Promise<void> }

// Guards on every test (PRD, Testing Decisions): nothing may load from
// another origin, and nothing may break the Content-Security-Policy.
export const test = base.extend<{ guards: void }>({
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

      const violations: string[] = []
      await page.exposeFunction("reportCspViolation", (violation: string) => {
        violations.push(violation)
      })
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (event) => {
          void (window as unknown as CspReporter).reportCspViolation(
            `${event.violatedDirective}: ${event.blockedURI}`
          )
        })
      })

      await use()

      expect(otherOrigins, "requests to other origins").toEqual([])
      expect(violations, "Content-Security-Policy violations").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
