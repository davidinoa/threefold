import { describe, expect, it } from "vitest"

import { siteFor } from "./site"

const production = {
  AUTH_RP_ID: "threefold.davidinoa.workers.dev",
  AUTH_ORIGINS: "https://threefold.davidinoa.workers.dev",
}
const local = {
  AUTH_RP_ID: "localhost",
  AUTH_ORIGINS: "http://localhost:3000 http://localhost:4173",
}
const previews = { AUTH_RP_ID: "*-threefold.davidinoa.workers.dev" }

describe("siteFor", () => {
  it("serves production only at its own origin", () => {
    expect(
      siteFor(production, "https://threefold.davidinoa.workers.dev/api/auth/ok")
    ).toEqual({
      rpID: "threefold.davidinoa.workers.dev",
      origin: "https://threefold.davidinoa.workers.dev",
      origins: ["https://threefold.davidinoa.workers.dev"],
    })
    expect(
      siteFor(production, "https://4f2e9a1c-threefold.davidinoa.workers.dev/")
    ).toBeUndefined()
    expect(
      siteFor(production, "http://threefold.davidinoa.workers.dev/")
    ).toBeUndefined()
  })

  it("serves local development at each of its ports", () => {
    expect(siteFor(local, "http://localhost:4173/api/auth/ok")).toEqual({
      rpID: "localhost",
      origin: "http://localhost:4173",
      origins: ["http://localhost:3000", "http://localhost:4173"],
    })
    expect(siteFor(local, "http://localhost:5173/")).toBeUndefined()
    expect(siteFor(local, "http://127.0.0.1:3000/")).toBeUndefined()
  })

  it("serves a preview at the hostname it's on, when that matches the pattern", () => {
    expect(
      siteFor(previews, "https://feat-shelf-threefold.davidinoa.workers.dev/x")
    ).toEqual({
      rpID: "feat-shelf-threefold.davidinoa.workers.dev",
      origin: "https://feat-shelf-threefold.davidinoa.workers.dev",
      origins: ["https://feat-shelf-threefold.davidinoa.workers.dev"],
    })
  })

  it.each([
    ["the production hostname", "https://threefold.davidinoa.workers.dev/"],
    ["another Worker", "https://feat-shelf-other.davidinoa.workers.dev/"],
    ["a nested name", "https://a.feat-threefold.davidinoa.workers.dev/"],
    [
      "a lookalike",
      "https://feat-threefold.davidinoa.workers.dev.example.com/",
    ],
    ["plain HTTP", "http://feat-shelf-threefold.davidinoa.workers.dev/"],
  ])("refuses %s on a preview", (_, url) => {
    expect(siteFor(previews, url)).toBeUndefined()
  })

  it("serves nothing without an RP ID", () => {
    expect(siteFor({}, "http://localhost:3000/")).toBeUndefined()
  })
})
