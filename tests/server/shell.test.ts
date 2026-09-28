import { exports } from "cloudflare:workers"
import { describe, expect, it } from "vitest"

// The built Worker, called over HTTP.
function request(path: string) {
  return exports.default.fetch(`http://localhost${path}`)
}

describe("the shell", () => {
  it("answers every page with the same shell", async () => {
    const root = await request("/")
    expect(root.status).toBe(200)
    expect(root.headers.get("content-type")).toContain("text/html")
    const shell = await root.text()
    expect(shell).toContain("<title>Threefold</title>")

    const paths = ["/review", "/shelf/2026-09", "/nowhere"]
    const pages = await Promise.all(
      paths.map(async (path) => {
        const page = await request(path)
        return {
          path,
          status: page.status,
          sameShell: (await page.text()) === shell,
        }
      })
    )
    expect(pages).toEqual(
      paths.map((path) => ({ path, status: 200, sameShell: true }))
    )
  })

  it("holds only the root route, so it fits any page", async () => {
    // The router's dehydrated state lists each match as i:"<route id>\0…".
    // Without the build's TSS_SHELL, the prerender matched "/" too
    // (TanStack/router#7740).
    const shell = await (await request("/")).text()
    const matched = [...shell.matchAll(/\bi:"([^"\0]*)/g)].map(([, id]) => id)
    expect(matched).toEqual(["__root__"])
  })

  it("sends the API and server functions to Start, not the shell", async () => {
    const api = await request("/api/nowhere")
    expect(api.status).toBe(404)

    const serverFunction = await request("/_serverFn/nowhere")
    expect(serverFunction.status).toBe(403)
  })
})
