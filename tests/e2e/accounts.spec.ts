import { deviceLabel } from "@/lib/auth/options"

import { expect, test } from "./fixtures"
import {
  keepJar,
  openJar,
  passkeyDevice,
  sessionOf,
  syncPasskeys,
} from "./passkeys"

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "WebKit has no virtual authenticator"
)

test("keeping a jar makes an account that holds nothing identifying", async ({
  page,
}) => {
  await passkeyDevice(page)
  await page.goto("/")

  const { options, status } = await keepJar(page)
  expect(status).toBe(200)
  // Asked for at creation, so these passkeys can carry encryption later.
  expect(options.extensions).toMatchObject({ prf: {} })

  const signedIn = await sessionOf(page)
  expect(signedIn?.user).toMatchObject({
    email: expect.stringMatching(/@users\.invalid$/),
    name: "Threefold",
  })
  // Nothing identifying: with tracking off, Better Auth leaves the IP address
  // empty, and a hook drops the user agent.
  expect(signedIn?.session).toHaveProperty("ipAddress")
  expect(signedIn?.session.ipAddress).toBeFalsy()
  expect(signedIn?.session).toHaveProperty("userAgent")
  expect(signedIn?.session.userAgent).toBeFalsy()

  const userAgent = await page.evaluate(() => navigator.userAgent)
  const passkeys: unknown = await page.evaluate(async () =>
    (await fetch("/api/auth/passkey/list-user-passkeys")).json()
  )
  expect(passkeys).toEqual([
    expect.objectContaining({ name: deviceLabel(userAgent) }),
  ])
})

test("a second device opens the jar with a copy of the passkey", async ({
  page,
  browser,
  baseURL,
}) => {
  const first = await passkeyDevice(page)
  await page.goto("/")
  expect((await keepJar(page)).status).toBe(200)
  const kept = await sessionOf(page)

  const context = await browser.newContext({ baseURL })
  try {
    const other = await context.newPage()
    const second = await passkeyDevice(other)
    expect(await syncPasskeys(first, second)).toBe(1)

    await other.goto("/")
    expect(await sessionOf(other)).toBeNull()
    expect(await openJar(other)).toBe(200)
    expect((await sessionOf(other))?.user.id).toBe(kept?.user.id)
  } finally {
    await context.close()
  }
})
