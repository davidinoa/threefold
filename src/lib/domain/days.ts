import type { DayKey } from "./types"

const DAY_MS = 86_400_000

// Calendar arithmetic on day keys. It runs in UTC, so a daylight saving
// change never adds or loses a day. The keys themselves are local dates.
function toTime(day: DayKey): number {
  const [year, month, date] = day.split("-").map(Number)
  return Date.UTC(year, month - 1, date)
}

export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS)
}

export function addDays(day: DayKey, days: number): DayKey {
  return new Date(toTime(day) + days * DAY_MS).toISOString().slice(0, 10)
}
