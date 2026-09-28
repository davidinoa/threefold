import { expect, test } from "./fixtures"

// On the iPhone, the airplane-mode check covers it.
test.skip(
  ({ browserName }) => browserName !== "chromium",
  "Playwright supports service workers only in Chromium"
)

test("the app, and a link into it, open with no connection", async ({
  page,
  context,
}) => {
  await page.goto("/")
  // Ready once the service worker has saved the shell and the app's files.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)

  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await page.goto("/nowhere/deep")
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible()

  // The server's own paths are never cached, so with no connection they fail.
  const api = await page.evaluate(() =>
    fetch("/api/auth/ok").then(
      () => "answered",
      () => "failed"
    )
  )
  expect(api).toBe("failed")
})
