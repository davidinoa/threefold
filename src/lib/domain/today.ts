import type { CategoryKey } from "@/lib/categories"

import { categoryOf } from "./cycle"
import { addDays } from "./days"
import type { DayKey, Star } from "./types"

/** What Today shows. The Today story adds the rounds, the status, and the counts. */
export type TodayView = {
  day: DayKey
  category: CategoryKey
  /** The next day's category, not the next round's. */
  tomorrow: CategoryKey
}

export function todayView(_stars: readonly Star[], today: DayKey): TodayView {
  return {
    day: today,
    category: categoryOf(today),
    tomorrow: categoryOf(addDays(today, 1)),
  }
}
