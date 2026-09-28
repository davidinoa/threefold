// The jar's rules: one view per screen, with stars and today's day key in and
// plain data out (system design §4.4). Screens and tests use only what's here.
export { todayView, type TodayView } from "./today"
export type { DayKey, Star } from "./types"
