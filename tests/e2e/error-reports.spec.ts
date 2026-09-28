import type { Page } from "@playwright/test"

import { expect, test } from "./fixtures"

// Waits for the report of the error a test caused, by the error's name.
function reportNamed(page: Page, name: string) {
  return page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/errors") &&
      (request.postDataJSON() as { name?: unknown }).name === name
  )
}

test("an uncaught error reaches the server without the text it quoted", async ({
  page,
  guards,
}) => {
  await page.goto("/")
  const reported = reportNamed(page, "TypeError")
  await page.evaluate(() => {
    setTimeout(() => {
      throw new TypeError('Could not fold "Dinner with Sam"')
    })
  })

  const request = await reported
  const report: unknown = request.postDataJSON()
  expect(report).toEqual({
    name: "TypeError",
    message: 'Could not fold "…"',
    stack: expect.not.stringContaining("Dinner with Sam"),
    route: "/",
    version: expect.stringMatching(/^([0-9a-f]{7,}|dev)$/),
    browser: expect.stringMatching(/^(Chrome|Safari) \d+, \w+/),
  })
  expect((await request.response())?.status()).toBe(204)

  // Thrown on purpose, so the guards shouldn't fail the test for it.
  await expect
    .poll(() => guards.pageErrors)
    .toEqual([expect.stringContaining('Could not fold "Dinner with Sam"')])
  guards.pageErrors.splice(0)
})

test("a rejection with a plain value sends only its type", async ({
  page,
  guards,
}) => {
  await page.goto("/")
  const reported = reportNamed(page, "NonError")
  await page.evaluate(() => {
    // A rejected promise that nothing handles, holding a line of text.
    void Promise.reject("Dinner with Sam")
  })

  const report: unknown = (await reported).postDataJSON()
  expect(report).toMatchObject({ message: "Thrown string", stack: "" })

  // Left unhandled on purpose, so the guards shouldn't fail the test for it.
  await expect.poll(() => guards.pageErrors).toEqual(["Dinner with Sam"])
  guards.pageErrors.splice(0)
})
