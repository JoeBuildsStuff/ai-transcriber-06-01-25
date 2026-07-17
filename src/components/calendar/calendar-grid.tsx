import { CalendarAgenda } from "./calendar-agenda"
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
  currentDate: Date
  onSelectDay: (date: Date) => void
}

export const CalendarGrid = ({
  view,
  currentDate,
  onSelectDay,
  calendarDays,
  meetingsByDay,
  meetingTimeFormatter,
  dayDescriptionFormatter,
  isToday,
}: CalendarGridProps) => {
  if (view === "week") {
    return (
      <CalendarWeekGrid
        calendarDays={calendarDays}
        meetingsByDay={meetingsByDay}
        meetingTimeFormatter={meetingTimeFormatter}
        dayDescriptionFormatter={dayDescriptionFormatter}
        isToday={isToday}
      />
    )
  }

  if (view === "day") {
    return (
      <CalendarDayGrid
        calendarDays={calendarDays}
        meetingsByDay={meetingsByDay}
        meetingTimeFormatter={meetingTimeFormatter}
        dayDescriptionFormatter={dayDescriptionFormatter}
        isToday={isToday}
      />
    )
  }

  if (view === "agenda") {
    return (
      <CalendarAgenda
        meetingsByDay={meetingsByDay}
        meetingTimeFormatter={meetingTimeFormatter}
        dayDescriptionFormatter={dayDescriptionFormatter}
        isToday={isToday}
        currentDate={currentDate}
        onSelectDay={onSelectDay}
      />
    )
  }

  return (
    <CalendarMonthGrid
      calendarDays={calendarDays}
      meetingsByDay={meetingsByDay}
      meetingTimeFormatter={meetingTimeFormatter}
      dayDescriptionFormatter={dayDescriptionFormatter}
      isToday={isToday}
      onSelectDay={onSelectDay}
    />
  )
}
