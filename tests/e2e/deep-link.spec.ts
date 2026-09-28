import { expect, test } from "./fixtures"

test("a deep link loads the app", async ({ page }) => {
  const response = await page.goto("/nowhere/deep")
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle("Threefold")
  // The shell holds no screen, so this heading can only come from the client
  // router, which shows its not-found page for a path with no route.
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible()
})
