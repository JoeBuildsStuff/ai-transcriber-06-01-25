import { useMemo, useState } from "react"


import {
  CurrentTimeIndicator,
  ScheduleDayColumn,
  SCHEDULE_VIEW_HOURS,
  SCHEDULE_VIEW_TIME_ZONES,
} from "./calendar-grid-week"
import { type CalendarDay } from "./hooks/use-calendar-days"
import { type DayMeeting, makeDateKey } from "./hooks/use-calendar-meetings"
import { CalendarMeetingDetailsSheet } from "./calendar-meeting-details-sheet"

type CalendarDayGridProps = {
  calendarDays: CalendarDay[]
  meetingsByDay: Map<string, DayMeeting[]>
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
  isToday: (date: Date) => boolean
}

export const CalendarDayGrid = ({
  calendarDays,
  meetingsByDay,
  meetingTimeFormatter,
  dayDescriptionFormatter,
  isToday,
}: CalendarDayGridProps) => {
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
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    []
  )

  if (calendarDays.length === 0) {
    return null
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="grid grid-cols-[8rem_minmax(0,1fr)]">
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
                className={`px-4 py-3 text-left text-sm font-semibold ${
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
          <div className="relative grid min-h-192 grid-cols-[8rem_minmax(0,1fr)]">
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
