"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { type MeetingSummary } from "./types/meetings"

import { CalendarGrid } from "./calendar-grid"
import { CalendarHeader } from "./calendar-header"
import { useCalendarNavigation } from "./hooks/use-calendar-navigation"
import { useCalendarDays } from "./hooks/use-calendar-days"
import { useCalendarMeetings } from "./hooks/use-calendar-meetings"
import { getCalendarFetchRange, getCalendarRangeKey } from "./lib/calendar-range"
import {
  formatCalendarDateParam,
  getCalendarViewLabel,
  isSameCalendarDay,
  parseCalendarDateParam,
  parseCalendarViewParam,
  type SupportedCalendarView,
} from "./lib/calendar-url"

type CalendarProps = {
  initialMeetings: MeetingSummary[]
  initialView: SupportedCalendarView
  initialDate: string
}

export function Calendar({ initialMeetings, initialView, initialDate }: CalendarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedView =
    parseCalendarViewParam(searchParams.get("view")) ?? initialView
  const currentDate =
    parseCalendarDateParam(searchParams.get("date")) ??
    parseCalendarDateParam(initialDate) ??
    new Date()

  const [meetings, setMeetings] = useState(initialMeetings)
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false)
  const initialRangeKeyRef = useRef(
    getCalendarRangeKey(initialView, parseCalendarDateParam(initialDate) ?? new Date())
  )
  const hasSkippedInitialFetchRef = useRef(false)

  const syncUrl = useCallback(
    (view: SupportedCalendarView, date: Date) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", view)
      params.set("date", formatCalendarDateParam(date))
      const nextQuery = params.toString()
      const currentQuery = searchParams.toString()
      if (nextQuery === currentQuery) {
        return
      }
      router.replace(`${pathname}?${nextQuery}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const handleDateChange = useCallback(
    (nextDate: Date) => {
      syncUrl(selectedView, nextDate)
    },
    [selectedView, syncUrl]
  )

  const handleViewSelect = useCallback(
    (nextView: string) => {
      const parsed = parseCalendarViewParam(nextView)
      syncUrl(parsed ?? "month", currentDate)
    },
    [currentDate, syncUrl]
  )

  const {
    month,
    year,
    goToNextRange,
    goToPreviousRange,
    goToToday,
    selectMonth,
    selectYear,
    selectDay,
    selectWeekStart,
  } = useCalendarNavigation({
    selectedView,
    date: currentDate,
    onDateChange: handleDateChange,
  })

  const handleSelectDay = useCallback(
    (date: Date) => {
      syncUrl("day", date)
    },
    [syncUrl]
  )

  const calendarDays = useCalendarDays(currentDate, selectedView)
  const { meetingsByDay, meetingTimeFormatter, dayDescriptionFormatter } =
    useCalendarMeetings(meetings)

  const rangeKey = getCalendarRangeKey(selectedView, currentDate)

  useEffect(() => {
    if (!searchParams.get("view") || !searchParams.get("date")) {
      syncUrl(selectedView, currentDate)
    }
    // Intentionally only on mount / when params are missing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasSkippedInitialFetchRef.current && rangeKey === initialRangeKeyRef.current) {
      hasSkippedInitialFetchRef.current = true
      setMeetings(initialMeetings)
      return
    }

    hasSkippedInitialFetchRef.current = true
    const { from, to } = getCalendarFetchRange(selectedView, currentDate)
    const controller = new AbortController()

    const loadMeetings = async () => {
      setIsLoadingMeetings(true)
      try {
        const response = await fetch(
          `/api/calendar/meetings?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
          { signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error("Failed to load calendar meetings")
        }
        const payload = (await response.json()) as { meetings: MeetingSummary[] }
        setMeetings(payload.meetings)
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return
        }
        console.error(error)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingMeetings(false)
        }
      }
    }

    void loadMeetings()

    return () => {
      controller.abort()
    }
  }, [currentDate, initialMeetings, rangeKey, selectedView])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        goToPreviousRange()
        return
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        goToNextRange()
        return
      }

      if (event.key === "t" || event.key === "T") {
        event.preventDefault()
        goToToday()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [goToNextRange, goToPreviousRange, goToToday])

  const isToday = useCallback((date: Date) => isSameCalendarDay(date, new Date()), [])

  const selectedViewLabel = useMemo(
    () => getCalendarViewLabel(selectedView),
    [selectedView]
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="shrink-0">
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
      </div>
      <div className="relative min-h-0 flex-1">
        {isLoadingMeetings ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse bg-primary/70" />
          </div>
        ) : null}
        <CalendarGrid
          calendarDays={calendarDays}
          meetingsByDay={meetingsByDay}
          meetingTimeFormatter={meetingTimeFormatter}
          dayDescriptionFormatter={dayDescriptionFormatter}
          isToday={isToday}
          view={selectedView}
          currentDate={currentDate}
          onSelectDay={handleSelectDay}
        />
      </div>
    </div>
  )
}
