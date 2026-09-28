import type { CategoryKey } from "@/lib/categories"

/** The device's local date, as "YYYY-MM-DD". */
export type DayKey = string

/** One folded line (system design §3.2). */
export type Star = {
  id: string
  /** The local date it was folded. Never changes. */
  day: DayKey
  /** Never changes. */
  category: CategoryKey
  /** 1 to 120 characters, trimmed. Empty once the star is taken out. */
  text: string
  /** When it was folded, in milliseconds since 1970, by the device's clock. */
  createdAt: number
  /** When it last changed. The latest change wins. */
  updatedAt: number
  /** True once the star is taken out, which makes it a tombstone. */
  deleted: boolean
}
