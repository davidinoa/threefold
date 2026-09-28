import { exports } from "cloudflare:workers"
import { afterEach, describe, expect, it, vi } from "vitest"

// The built Worker, called over HTTP.
function post(path: string, body: string) {
  return exports.default.fetch(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
}

// Everything the Worker writes to its logs, one string per call.
function captureLogs() {
  const lines: string[] = []
  for (const level of ["debug", "error", "info", "log", "warn"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      lines.push(
        args
          .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
          .join(" ")
      )
    })
  }
  return lines
}

afterEach(() => {
  vi.restoreAllMocks()
})

const report = {
  name: "TypeError",
  message: "Cannot read properties of undefined (reading '…')",
  stack:
    "TypeError: Cannot read properties of undefined (reading '…')\n    at fold (/assets/index.js:1:2)",
  route: "/",
  version: "abc1234",
  browser: "Chrome 141, macOS",
}

describe("/api/errors", () => {
  it("logs a report as one JSON line, and answers 204", async () => {
    const logs = captureLogs()
    const response = await post("/api/errors", JSON.stringify(report))
    expect(response.status).toBe(204)
    expect(logs.map((line): unknown => JSON.parse(line))).toEqual([
      { event: "client-error", ...report },
    ])
  })

  it("hides quoted text that a client missed", async () => {
    const logs = captureLogs()
    await post(
      "/api/errors",
      JSON.stringify({ ...report, message: 'Could not fold "Dinner with Sam"' })
    )
    expect(logs.map((line): unknown => JSON.parse(line))).toEqual([
      { event: "client-error", ...report, message: 'Could not fold "…"' },
    ])
  })

  it("turns away anything but a report, without logging it", async () => {
    const logs = captureLogs()
    const bodies = [
      "Dinner with Sam",
      JSON.stringify({ ...report, text: "Dinner with Sam" }),
      JSON.stringify({
        ...report,
        message: `Dinner with Sam${".".repeat(200)}`,
      }),
      JSON.stringify({ ...report, route: "/?line=Dinner+with+Sam" }),
    ]
    const statuses = await Promise.all(
      bodies.map(async (body) => (await post("/api/errors", body)).status)
    )
    expect(statuses).toEqual([400, 400, 400, 400])
    expect(logs).toEqual([])
  })

  it("refuses a body too big to be a report", async () => {
    const response = await post("/api/errors", "x".repeat(10_000))
    expect(response.status).toBe(413)
  })
})

describe("the server's logs", () => {
  it("never hold a request's body", async () => {
    const logs = captureLogs()
    const body = JSON.stringify({ text: "Dinner with Sam" })
    const paths = ["/api/errors", "/api/nowhere", "/_serverFn/nowhere", "/"]
    await Promise.all(paths.map((path) => post(path, body)))
    expect(logs.filter((line) => line.includes("Dinner with Sam"))).toEqual([])
  })
})
