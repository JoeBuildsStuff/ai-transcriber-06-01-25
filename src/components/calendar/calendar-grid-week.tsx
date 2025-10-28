import { useMemo, useState, type CSSProperties } from "react"


import { type CalendarDay } from "./hooks/use-calendar-days"
import { type DayMeeting, makeDateKey } from "./hooks/use-calendar-meetings"
import { MeetingBlock } from "./meeting-block"
import { MINUTES_PER_DAY, useCurrentTimePercentage } from "./hooks/use-current-time"
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
const WEEK_GRID_TEMPLATE = "grid-cols-[8rem_repeat(5,minmax(0,1fr))]"

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

  const timeZoneHourFormatters = useMemo(
    () =>
      SCHEDULE_VIEW_TIME_ZONES.map(({ timeZone }) =>
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
      <div className="flex h-full flex-col overflow-hidden">
        <div className={`grid ${WEEK_GRID_TEMPLATE}`}>
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-end">
            <div className="flex justify-between w-full">
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
                className={`px-4 py-3 text-sm font-semibold text-center ${
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
        <div className="flex-1 overflow-auto">
          <div className={`relative grid min-h-192 ${WEEK_GRID_TEMPLATE}`}>
            <div>
              <div className="grid h-full grid-rows-[repeat(24,minmax(3.5rem,1fr))] border-t border-border">
                {SCHEDULE_VIEW_HOURS.map((hour, hourIndex) => {
                  const isLastRow = hourIndex === SCHEDULE_VIEW_HOURS.length - 1
                  const rowClass = isLastRow
                    ? "relative"
                    : "relative border-b border-border"
                  const timeValue = timeSlotDates[hourIndex]

                  return (
                    <div key={hour} className={rowClass}>
                      <div className="pointer-events-none absolute inset-x-0 top-0 flex -translate-y-1/2 justify-between px-2">
                        {timeZoneHourFormatters.map((formatter, index) => (
                          <time
                            key={index}
                            className="pointer-events-none text-xs font-medium text-muted-foreground"
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
            <CurrentTimeIndicator />
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
      <div className="grid h-full grid-rows-[repeat(24,minmax(3.5rem,1fr))] border-t border-border">
        {SCHEDULE_VIEW_HOURS.map((hour, index) => {
          const isLastRow = index === SCHEDULE_VIEW_HOURS.length - 1
          const rowClass = isLastRow ? "relative" : "relative border-b border-border"
          return <div key={hour} className={rowClass} />
        })}
      </div>
      <div className="absolute inset-0 px-2 py-1">
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
          const ariaLabel = `${meeting.title} at ${meetingStartLabel} for ${durationLabel}`

          return (
            <MeetingBlock
              key={meeting.id}
              as="button"
              meetingTitle={meeting.title}
              startTimeLabel={meetingStartLabel}
              durationLabel={durationLabel}
              startDateTime={meetingDate.toISOString()}
              className="absolute left-2 right-2 text-xs"
              style={meetingPositionStyle}
              aria-label={ariaLabel}
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
