import { exports } from "cloudflare:workers"
import { describe, expect, it } from "vitest"

import { ORIGIN, signIn } from "./fixtures"

// The built Worker, called over HTTP.
function request(url: string, init?: RequestInit) {
  return exports.default.fetch(url, init)
}

describe("/api/auth", () => {
  it("accepts a session the sign-in fixture made", async () => {
    const { user, headers } = await signIn()
    const response = await request(`${ORIGIN}/api/auth/get-session`, {
      headers,
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { user?: { id?: string } }
    expect(body.user?.id).toBe(user.id)
  })

  it("answers only on a site this environment serves", async () => {
    const served = await request(`${ORIGIN}/api/auth/ok`)
    expect(served.status).toBe(200)

    const elsewhere = await request("http://127.0.0.1:3000/api/auth/ok")
    expect(elsewhere.status).toBe(404)
  })

  it("refuses a signed-in request from another origin", async () => {
    const { headers } = await signIn()
    headers.set("Origin", "https://elsewhere.example")
    const response = await request(`${ORIGIN}/api/auth/sign-out`, {
      method: "POST",
      headers,
    })
    expect(response.status).toBe(403)
  })
})
