import { describe, expect, it } from "vitest"

import { authOptions, deviceLabel } from "./options"

const site = {
  rpID: "localhost",
  origin: "http://localhost:3000",
  origins: ["http://localhost:3000", "http://localhost:4173"],
}

describe("deviceLabel", () => {
  it.each([
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
      "iPhone",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "Mac",
    ],
    [
      "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
      "Android",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "Windows",
    ],
    ["", "Passkey"],
  ])("%s", (userAgent, label) => {
    expect(deviceLabel(userAgent)).toBe(label)
  })
})

describe("authOptions", () => {
  it("keeps no user agent on a new session", async () => {
    const session = {
      id: "s",
      token: "t",
      userId: "u",
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)",
    }
    const kept =
      await authOptions(site).databaseHooks.session.create.before(session)
    expect(kept.data.userAgent).toBeNull()
  })

  it("asks every new passkey for PRF, and needs no session to make one", () => {
    const [passkey] = authOptions(site).plugins
    expect(passkey?.options?.registration).toMatchObject({
      requireSession: false,
      extensions: { prf: {} },
    })
  })
})
