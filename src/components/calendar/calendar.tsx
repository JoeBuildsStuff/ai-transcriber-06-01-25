"use client"

import { useMemo, useState } from "react"

import { type MeetingSummary } from "./types/meetings"

import { CalendarGrid } from "./calendar-grid"
import { CalendarHeader } from "./calendar-header"
import { type CalendarView, CALENDAR_VIEWS } from "./constants"
import { useCalendarNavigation } from "./hooks/use-calendar-navigation"
import { useCalendarDays } from "./hooks/use-calendar-days"
import { useCalendarMeetings } from "./hooks/use-calendar-meetings"

type CalendarProps = {
  meetings: MeetingSummary[]
}

export function Calendar({ meetings }: CalendarProps) {
  const supportedViews = useMemo(() => new Set<CalendarView>(["day", "week", "month"]), [])
  const [selectedView, setSelectedView] = useState<CalendarView>("month")
  const {
    currentDate,
    month,
    year,
    goToNextRange,
    goToPreviousRange,
    goToToday,
    selectMonth,
    selectYear,
    selectDay,
    selectWeekStart,
  } = useCalendarNavigation(selectedView)

  const calendarDays = useCalendarDays(currentDate, selectedView)
  const { meetingsByDay, meetingTimeFormatter, dayDescriptionFormatter } =
    useCalendarMeetings(meetings)


  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const handleViewSelect = (nextView: string) => {
    const nextViewValue = nextView as CalendarView
    if (supportedViews.has(nextViewValue)) {
      setSelectedView(nextViewValue)
      return
    }

    setSelectedView("month")
  }

  const selectedViewLabel = useMemo(() => {
    const matchingView = CALENDAR_VIEWS.find(({ value }) => value === selectedView)
    return matchingView ? matchingView.label : "Month"
  }, [selectedView])

  return (
    <div className="flex h-full flex-col">
      <CalendarHeader
        month={month}
        year={year}
        currentDate={currentDate}
        selectedView={selectedView}
        selectedViewLabel={selectedViewLabel}
        onPrevMonth={goToPreviousRange}
        onNextMonth={goToNextRange}
        onToday={goToToday}
        onMonthSelect={selectMonth}
        onYearSelect={selectYear}
        onViewSelect={handleViewSelect}
        onDaySelect={selectDay}
        onWeekSelect={selectWeekStart}
      />
      <CalendarGrid
        calendarDays={calendarDays}
        meetingsByDay={meetingsByDay}
        meetingTimeFormatter={meetingTimeFormatter}
        dayDescriptionFormatter={dayDescriptionFormatter}
        isToday={isToday}
        view={selectedView}
      />
    </div>
  )
}
