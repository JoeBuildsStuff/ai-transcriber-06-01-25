import type { SupportedCalendarView } from "./calendar-url"

const startOfDay = (date: Date) => {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

const getWeekStartMonday = (date: Date) => {
  const start = startOfDay(date)
  const daysFromMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysFromMonday)
  return start
}

/** Inclusive-ish window used to load meetings for the visible calendar range (+ buffer). */
export const getCalendarFetchRange = (
  view: SupportedCalendarView,
  date: Date
): { from: Date; to: Date } => {
  const focused = startOfDay(date)

  if (view === "day") {
    const from = new Date(focused)
    from.setDate(from.getDate() - 7)
    const to = new Date(focused)
    to.setDate(to.getDate() + 8)
    return { from, to }
  }

  if (view === "week") {
    const weekStart = getWeekStartMonday(focused)
    const from = new Date(weekStart)
    from.setDate(from.getDate() - 7)
    const to = new Date(weekStart)
    to.setDate(to.getDate() + 14)
    return { from, to }
  }

  if (view === "agenda") {
    const from = new Date(focused)
    from.setDate(from.getDate() - 1)
    const to = new Date(focused)
    to.setDate(to.getDate() + 60)
    return { from, to }
  }

  const from = new Date(focused.getFullYear(), focused.getMonth() - 1, 1)
  const to = new Date(focused.getFullYear(), focused.getMonth() + 2, 1)
  return { from, to }
}

export const getCalendarRangeKey = (view: SupportedCalendarView, date: Date): string => {
  const { from, to } = getCalendarFetchRange(view, date)
  return `${view}:${from.toISOString()}:${to.toISOString()}`
}
