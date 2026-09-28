// The eight categories, in the cycle's order (PRD, "The cycle").
export const CATEGORIES = [
  "people",
  "home",
  "talents",
  "luck",
  "body",
  "work",
  "knowledge",
  "abundance",
] as const

export type CategoryKey = (typeof CATEGORIES)[number]
