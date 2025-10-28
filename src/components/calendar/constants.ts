export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export const YEARS = Array.from({ length: 151 }, (_, index) => 1950 + index)

export const CALENDAR_VIEWS = [
  { label: "Day", value: "day" },
  { label: "Work Week", value: "work-week" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
] as const

export type CalendarView = (typeof CALENDAR_VIEWS)[number]["value"]
