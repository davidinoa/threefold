import { expect, test } from "./fixtures"

test("every way to the shell carries the CSP", async ({ request }) => {
  // Cloudflare serves static files before the Worker runs, so the shell's
  // own paths need the Worker too, or they'd come without the CSP.
  const paths = ["/", "/nowhere/deep", "/_shell", "/_shell.html"]
  const answers = await Promise.all(
    paths.map(async (path) => {
      const response = await request.get(path)
      const csp = response.headers()["content-security-policy"] ?? ""
      return {
        path,
        status: response.status(),
        hashedScripts: csp.includes("script-src 'self' 'sha256-"),
      }
    })
  )
  expect(answers).toEqual(
    paths.map((path) => ({ path, status: 200, hashedScripts: true }))
  )
})

test("the CSP blocks an injected inline script", async ({ page, guards }) => {
  await page.goto("/")
  await page.evaluate(() => {
    const script = document.createElement("script")
    script.textContent = "document.body.dataset.injected = 'ran'"
    document.body.appendChild(script)
  })

  await expect
    .poll(() => guards.cspViolations)
    .toEqual([expect.stringMatching(/^script-src(-elem)?: inline$/)])
  await expect(page.locator("body")).not.toHaveAttribute("data-injected")
  // Blocked on purpose, so the guards shouldn't fail the test for it.
  guards.cspViolations.splice(0)
})
