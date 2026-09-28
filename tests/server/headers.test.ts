import { exports } from "cloudflare:workers"
import { describe, expect, it } from "vitest"

// The built Worker, called over HTTP.
function request(path: string) {
  return exports.default.fetch(`http://localhost${path}`)
}

// A script's hash as a browser computes it: from the script as the HTML
// parser reads it, which turns CR LF into LF and NUL into U+FFFD.
async function sha256(script: string) {
  const parsed = script.replaceAll(/\r\n?/g, "\n").replaceAll("\0", "�")
  const bytes = new TextEncoder().encode(parsed)
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  return btoa(String.fromCharCode(...digest))
}

describe("security headers", () => {
  it("allow only the shell's own inline scripts, and nothing from elsewhere", async () => {
    const page = await request("/")
    const shell = await page.text()
    const scripts = [
      ...shell.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g),
    ].map(([, script]) => script)
    const hashes = await Promise.all(
      scripts.map(async (script) => `'sha256-${await sha256(script)}'`)
    )

    expect(page.headers.get("Content-Security-Policy")).toBe(
      [
        "default-src 'self'",
        ["script-src 'self'", ...hashes].join(" "),
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; ")
    )
  })

  it("go on pages and API answers alike", async () => {
    const expected = {
      "strict-transport-security": "max-age=31536000; includeSubDomains",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    }
    const paths = ["/", "/nowhere", "/api/nowhere"]
    const answers = await Promise.all(
      paths.map(async (path) => {
        const { headers } = await request(path)
        return Object.fromEntries(
          Object.keys(expected).map((name) => [name, headers.get(name)])
        )
      })
    )
    expect(answers).toEqual(paths.map(() => expected))
  })

  it("allow passkeys and the motion sensors, and turn the rest off", async () => {
    const header = (await request("/")).headers.get("Permissions-Policy") ?? ""
    const features = header.split(", ").map((entry) => entry.split("="))
    const allowed = features
      .filter(([, allowlist]) => allowlist === "(self)")
      .map(([feature]) => feature)

    expect(new Set(allowed)).toEqual(
      new Set([
        "publickey-credentials-create",
        "publickey-credentials-get",
        "accelerometer",
        "gyroscope",
      ])
    )
    expect(
      features.filter(
        ([, allowlist]) => allowlist !== "(self)" && allowlist !== "()"
      )
    ).toEqual([])
  })
})
