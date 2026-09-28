import { describe, expect, it, vi } from "vitest"

import {
  type ErrorReport,
  LIMITS,
  coarseBrowser,
  createReporter,
  redactQuoted,
  toReport,
} from "./error-reports"

const where = { route: "/", version: "abc1234", browser: "Chrome 141, macOS" }

describe("redactQuoted", () => {
  it.each([
    [
      "Cannot read properties of undefined (reading 'text')",
      "Cannot read properties of undefined (reading '…')",
    ],
    [
      `Unexpected token 'D', "Dinner with Sam" is not valid JSON`,
      `Unexpected token '…', "…" is not valid JSON`,
    ],
    ["Couldn't fold “Dinner with Sam”", "Couldn't fold “…”"],
    ["Bad line `a\nb` here", "Bad line `…` here"],
    [`Unterminated "Dinner with Sam`, `Unterminated "…`],
    ["No quotes at all", "No quotes at all"],
  ])("%j becomes %j", (text, redacted) => {
    expect(redactQuoted(text)).toBe(redacted)
  })
})

describe("toReport", () => {
  it("keeps only the six fields, with quoted text hidden", () => {
    const error = Object.assign(new TypeError(`Can't save "Dinner with Sam"`), {
      value: "Dinner with Sam",
    })
    const report = toReport(error, where)
    expect(new Set(Object.keys(report))).toEqual(
      new Set(["name", "message", "stack", "route", "version", "browser"])
    )
    expect(report).toMatchObject({
      name: "TypeError",
      message: `Can't save "…"`,
      ...where,
    })
    expect(JSON.stringify(report)).not.toContain("Dinner with Sam")
  })

  it("sends only the type of a thrown value that isn't an Error", () => {
    expect(toReport("Dinner with Sam", where)).toEqual({
      name: "NonError",
      message: "Thrown string",
      stack: "",
      ...where,
    })
  })

  it("cuts long fields to their limits", () => {
    const error = new Error("x".repeat(500))
    error.stack = "y".repeat(5000)
    const report = toReport(error, { ...where, route: `/${"z".repeat(500)}` })
    expect(report.message).toHaveLength(LIMITS.message)
    expect(report.stack).toHaveLength(LIMITS.stack)
    expect(report.route).toHaveLength(LIMITS.route)
  })
})

describe("coarseBrowser", () => {
  it.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "Chrome 141, macOS",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
      "Safari 26, iOS",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
      "Edge 141, Windows",
    ],
    [
      "Mozilla/5.0 (Android 16; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0",
      "Firefox 143, Android",
    ],
    ["curl/8.7.1", "Other browser, other system"],
  ])("%s", (userAgent, label) => {
    expect(coarseBrowser(userAgent)).toBe(label)
  })
})

describe("createReporter", () => {
  it("sends at most five reports per page load", () => {
    const send = vi.fn<(report: ErrorReport) => void>()
    const report = createReporter(send, () => where)
    for (let i = 0; i < 7; i += 1) report(new Error(`number ${i}`))
    expect(send).toHaveBeenCalledTimes(5)
  })
})
