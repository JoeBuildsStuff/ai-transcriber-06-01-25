import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"

import { type CalendarDay } from "./hooks/use-calendar-days"
import { type DayMeeting, makeDateKey } from "./hooks/use-calendar-meetings"
import { MeetingBlock } from "./meeting-block"
import { MINUTES_PER_DAY, getCurrentTimePercentage, useCurrentTimePercentage } from "./hooks/use-current-time"
import { CalendarMeetingDetailsSheet } from "./calendar-meeting-details-sheet"

export const SCHEDULE_VIEW_HOURS = Array.from({ length: 24 }, (_, hour) => hour)
export const SCHEDULE_VIEW_TIME_ZONES = [
  {
    label: "PST",
    description: "Pacific Standard Time",
    timeZone: "America/Los_Angeles",
  },
  {
    label: "CST",
    description: "Central Standard Time",
    timeZone: "America/Chicago",
  },
  {
    label: "EST",
    description: "Eastern Standard Time",
    timeZone: "America/New_York",
  },
] as const
const WEEK_GRID_TEMPLATE = "grid-cols-[5rem_repeat(7,minmax(0,1fr))]"
const HOUR_ROW_MIN_HEIGHT_REM = 3.5

export const CurrentTimeIndicator = () => {
  const topPercentage = useCurrentTimePercentage()

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500"
      style={{ top: `${topPercentage}%` }}
    />
  )
}

type CalendarWeekGridProps = {
  calendarDays: CalendarDay[]
  meetingsByDay: Map<string, DayMeeting[]>
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
  isToday: (date: Date) => boolean
}

export const CalendarWeekGrid = ({
  calendarDays,
  meetingsByDay,
  meetingTimeFormatter,
  dayDescriptionFormatter,
  isToday,
}: CalendarWeekGridProps) => {
  const [selectedMeeting, setSelectedMeeting] = useState<DayMeeting | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const showsToday = calendarDays.some(({ date }) => isToday(date))
  const rangeKey = calendarDays.map(({ date }) => makeDateKey(date)).join("|")

  useEffect(() => {
    if (!showsToday) {
      return
    }

    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const percentage = getCurrentTimePercentage()
      const target = (container.scrollHeight * percentage) / 100 - container.clientHeight / 3
      container.scrollTop = Math.max(0, target)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [rangeKey, showsToday])

  const timeZoneHourFormatters = useMemo(
    () =>
      SCHEDULE_VIEW_TIME_ZONES.map(
        ({ timeZone }) =>
          new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            timeZone,
          })
      ),
    []
  )

  const timeSlotDates = useMemo(() => {
    const referenceDate = calendarDays.length > 0 ? calendarDays[0].date : new Date()
    const referenceStart = new Date(referenceDate)
    referenceStart.setHours(0, 0, 0, 0)

    return SCHEDULE_VIEW_HOURS.map((hour) => {
      const slotDate = new Date(referenceStart)
      slotDate.setHours(hour, 0, 0, 0)
      return slotDate
    })
  }, [calendarDays])

  const headerFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    []
  )

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border">
        <div className={`grid shrink-0 ${WEEK_GRID_TEMPLATE}`}>
          <div className="flex items-end px-2 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="flex w-full justify-between gap-0.5">
              {SCHEDULE_VIEW_TIME_ZONES.map(({ label, description }) => (
                <span key={label} aria-label={description}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          {calendarDays.map(({ date }) => {
            const headerParts = headerFormatter.formatToParts(date)
            let weekdayLabel = ""
            let monthLabel = ""
            let dayLabel = ""

            for (const part of headerParts) {
              if (part.type === "weekday") {
                weekdayLabel = part.value
                continue
              }

              if (part.type === "month") {
                monthLabel = part.value
                continue
              }

              if (part.type === "day") {
                dayLabel = part.value
              }
            }

            const isCurrentDay = isToday(date)

            return (
              <div
                key={makeDateKey(date)}
                className={`px-2 py-3 text-center text-sm font-semibold ${
                  isCurrentDay ? "text-primary" : "text-foreground"
                }`}
              >
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  {weekdayLabel}
                </div>
                <div>{`${monthLabel} ${dayLabel}`}</div>
              </div>
            )
          })}
        </div>
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className={`relative grid min-h-192 ${WEEK_GRID_TEMPLATE}`}>
            <div>
              <div
                className="grid h-full border-t border-border"
                style={{
                  gridTemplateRows: `repeat(24, minmax(${HOUR_ROW_MIN_HEIGHT_REM}rem, 1fr))`,
                }}
              >
                {SCHEDULE_VIEW_HOURS.map((hour, hourIndex) => {
                  const isLastRow = hourIndex === SCHEDULE_VIEW_HOURS.length - 1
                  const rowClass = isLastRow
                    ? "relative"
                    : "relative border-b border-border"
                  const timeValue = timeSlotDates[hourIndex]

                  return (
                    <div key={hour} className={rowClass}>
                      <div className="pointer-events-none absolute inset-x-0 top-0 flex -translate-y-1/2 justify-between px-1">
                        {timeZoneHourFormatters.map((formatter, index) => (
                          <time
                            key={index}
                            className="pointer-events-none text-[10px] font-medium text-muted-foreground"
                            dateTime={timeValue.toISOString()}
                          >
                            {formatter.format(timeValue)}
                          </time>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {calendarDays.map(({ date }) => (
              <ScheduleDayColumn
                key={makeDateKey(date)}
                date={date}
                meetingsByDay={meetingsByDay}
                meetingTimeFormatter={meetingTimeFormatter}
                dayDescriptionFormatter={dayDescriptionFormatter}
                onMeetingSelect={setSelectedMeeting}
              />
            ))}
            {showsToday ? <CurrentTimeIndicator /> : null}
          </div>
        </div>
      </div>
      <CalendarMeetingDetailsSheet
        meeting={selectedMeeting}
        meetingTimeFormatter={meetingTimeFormatter}
        dayDescriptionFormatter={dayDescriptionFormatter}
        onClose={() => {
          setSelectedMeeting(null)
        }}
      />
    </>
  )
}

type ScheduleDayColumnProps = {
  date: Date
  meetingsByDay: Map<string, DayMeeting[]>
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
  onMeetingSelect: (meeting: DayMeeting) => void
}

export const ScheduleDayColumn = ({
  date,
  meetingsByDay,
  meetingTimeFormatter,
  dayDescriptionFormatter,
  onMeetingSelect,
}: ScheduleDayColumnProps) => {
  const dateKey = makeDateKey(date)
  const dayMeetings = meetingsByDay.get(dateKey) ?? []
  const ariaLabel = dayDescriptionFormatter.format(date)

  return (
    <div className="relative border-l border-border bg-background" aria-label={ariaLabel}>
      <div
        className="grid h-full border-t border-border"
        style={{
          gridTemplateRows: `repeat(24, minmax(${HOUR_ROW_MIN_HEIGHT_REM}rem, 1fr))`,
        }}
      >
        {SCHEDULE_VIEW_HOURS.map((hour, index) => {
          const isLastRow = index === SCHEDULE_VIEW_HOURS.length - 1
          const rowClass = isLastRow ? "relative" : "relative border-b border-border"
          return <div key={hour} className={rowClass} />
        })}
      </div>
      <div className="absolute inset-0 px-1 py-1">
        {dayMeetings.map((meeting) => {
          const meetingDate = meeting.meetingDate
          const meetingEndDate = meeting.meetingEndDate
          const startMinutes = meetingDate.getHours() * 60 + meetingDate.getMinutes()
          const durationMinutes = Math.max(
            1,
            Math.ceil((meetingEndDate.getTime() - meetingDate.getTime()) / 60000)
          )
          const remainingDayMinutes = Math.max(0, MINUTES_PER_DAY - startMinutes)
          const boundedDurationMinutes = Math.max(
            1,
            Math.min(durationMinutes, remainingDayMinutes)
          )
          const topPercentage = Math.min(
            100,
            Math.max(0, (startMinutes / MINUTES_PER_DAY) * 100)
          )
          const rawHeightPercentage = (boundedDurationMinutes / MINUTES_PER_DAY) * 100
          const minimumHeightPercentage = 1.5
          const boundedHeightPercentage = Math.min(
            Math.max(rawHeightPercentage, minimumHeightPercentage),
            Math.max(0, 100 - topPercentage)
          )

          const meetingPositionStyle: CSSProperties = {
            top: `${topPercentage}%`,
            height: `${boundedHeightPercentage}%`,
          }

          const meetingStartLabel = meetingTimeFormatter.format(meetingDate)
          const durationLabel = `${boundedDurationMinutes} min`
          const meetingAriaLabel = `${meeting.title} at ${meetingStartLabel} for ${durationLabel}`

          return (
            <MeetingBlock
              key={meeting.id}
              as="button"
              meetingTitle={meeting.title}
              startTimeLabel={meetingStartLabel}
              durationLabel={durationLabel}
              startDateTime={meetingDate.toISOString()}
              className="absolute left-1 right-1 text-xs"
              style={meetingPositionStyle}
              aria-label={meetingAriaLabel}
              variant={meeting.audioFilePath ? "green" : "default"}
              onClick={() => {
                onMeetingSelect(meeting)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}