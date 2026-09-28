import { expect, it } from "vitest"

// Probe: a planted failing test. This PR must not merge.
it("fails on purpose", () => {
  expect(1 + 1).toBe(3)
})
