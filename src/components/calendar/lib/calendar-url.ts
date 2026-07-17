import { CALENDAR_VIEWS, type CalendarView } from "../constants"

export const SUPPORTED_CALENDAR_VIEWS = [
  "day",
  "week",
  "month",
  "agenda",
] as const satisfies readonly CalendarView[]

export type SupportedCalendarView = (typeof SUPPORTED_CALENDAR_VIEWS)[number]

const SUPPORTED_VIEW_SET = new Set<string>(SUPPORTED_CALENDAR_VIEWS)

export const formatCalendarDateParam = (date: Date): string => {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const parseCalendarDateParam = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null
  }

  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

export const parseCalendarViewParam = (
  value: string | null | undefined
): SupportedCalendarView | null => {
  if (!value || !SUPPORTED_VIEW_SET.has(value)) {
    return null
  }

  return value as SupportedCalendarView
}

export const getCalendarViewLabel = (view: CalendarView): string => {
  if (view === "agenda") {
    return "Agenda"
  }

  const matchingView = CALENDAR_VIEWS.find(({ value }) => value === view)
  return matchingView ? matchingView.label : "Month"
}

export const isSameCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()
