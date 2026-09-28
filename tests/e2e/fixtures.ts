import { test as base, expect } from "@playwright/test"

type CspReporter = { reportCspViolation(violation: string): Promise<void> }

type Guards = {
  /** What broke the Content-Security-Policy, as "directive: blocked URI". */
  cspViolations: string[]
  /** The messages of errors the page didn't catch. */
  pageErrors: string[]
}

// Guards on every test (PRD, Testing Decisions): nothing may load from
// another origin, nothing may break the Content-Security-Policy, and nothing
// may throw without being caught. A test that trips a guard on purpose checks
// what it caught in guards, then empties that list.
export const test = base.extend<{ guards: Guards }>({
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

      const pageErrors: string[] = []
      page.on("pageerror", (error) => {
        pageErrors.push(error.message)
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

      await use({ cspViolations, pageErrors })

      expect(otherOrigins, "requests to other origins").toEqual([])
      expect(cspViolations, "Content-Security-Policy violations").toEqual([])
      expect(pageErrors, "errors the page didn't catch").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
