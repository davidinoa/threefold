import { CATEGORIES, type CategoryKey } from "@/lib/categories"

import { daysBetween } from "./days"
import type { DayKey } from "./types"

// Day 0 of the cycle. September 23, 2026 is 266 days later, and 266 mod 8
// is 2, so it's Talents.
const START: DayKey = "2025-12-31"

/** The day's category: one step along the cycle each day, with no break at New Year. */
export function categoryOf(day: DayKey): CategoryKey {
  const { length } = CATEGORIES
  const step = daysBetween(START, day) % length
  return CATEGORIES[(step + length) % length]
}
