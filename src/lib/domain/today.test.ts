import { describe, expect, it } from "vitest"

import { CATEGORIES } from "@/lib/categories"
import { todayView } from "@/lib/domain"

// Day keys for the tests, made without the domain's own date arithmetic.
function dayAfter(start: string, days: number): string {
  const [year, month, date] = start.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, date + days))
    .toISOString()
    .slice(0, 10)
}

describe("the cycle", () => {
  it("makes September 23, 2026 a Talents day, 266 days after the start", () => {
    expect(todayView([], "2026-09-23").category).toBe("talents")
  })

  it("names tomorrow's category as the next day's", () => {
    expect(todayView([], "2026-09-23").tomorrow).toBe("luck")
  })

  it("advances one step every day for ten years", () => {
    let previous = todayView([], "2026-01-01").category
    for (let day = 1; day <= 3653; day++) {
      const { category } = todayView([], dayAfter("2026-01-01", day))
      const next = (CATEGORIES.indexOf(previous) + 1) % CATEGORIES.length
      expect(category).toBe(CATEGORIES[next])
      previous = category
    }
  })

  it("doesn't jump at New Year", () => {
    expect(todayView([], "2026-12-31").category).toBe("work")
    expect(todayView([], "2027-01-01").category).toBe("knowledge")
  })
})
