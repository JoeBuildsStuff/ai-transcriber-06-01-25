
import { CalendarDayGrid } from "./calendar-grid-day"
import { CalendarMonthGrid } from "./calendar-grid-month"
import { CalendarWeekGrid } from "./calendar-grid-week"
import { type CalendarView } from "./constants"
import { type CalendarDay } from "./hooks/use-calendar-days"
import { type DayMeeting } from "./hooks/use-calendar-meetings"

type CalendarGridProps = {
  calendarDays: CalendarDay[]
  meetingsByDay: Map<string, DayMeeting[]>
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
  isToday: (date: Date) => boolean
  view: CalendarView
}

export const CalendarGrid = ({ view, ...gridProps }: CalendarGridProps) => {
  if (view === "week") {
    return <CalendarWeekGrid {...gridProps} />
  }

  if (view === "day") {
    return <CalendarDayGrid {...gridProps} />
  }

  return <CalendarMonthGrid {...gridProps} />
}
