"use client"

import { useMemo, useState } from "react"

import { MONTH_VISIBLE_MEETING_COUNT } from "./constants"
import { CalendarDayPopover } from "./calendar-day-popover"
import { CalendarMeetingDetailsSheet } from "./calendar-meeting-details-sheet"
import { type CalendarDay } from "./hooks/use-calendar-days"
import { type DayMeeting, makeDateKey } from "./hooks/use-calendar-meetings"
import { MeetingBlock } from "./meeting-block"

type CalendarMonthGridProps = {
  calendarDays: CalendarDay[]
  meetingsByDay: Map<string, DayMeeting[]>
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
  isToday: (date: Date) => boolean
  onSelectDay: (date: Date) => void
}

export const CalendarMonthGrid = ({
  calendarDays,
  meetingsByDay,
  meetingTimeFormatter,
  dayDescriptionFormatter,
  isToday,
  onSelectDay,
}: CalendarMonthGridProps) => {
  const [selectedMeeting, setSelectedMeeting] = useState<DayMeeting | null>(null)
  const [openDayKey, setOpenDayKey] = useState<string | null>(null)
  const weekCount = useMemo(
    () => Math.max(1, Math.ceil(calendarDays.length / 7)),
    [calendarDays.length]
  )

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border">
        <div
          className="grid h-full min-h-0 grid-cols-7"
          style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
        >
          {calendarDays.map(({ date, inCurrentMonth }, index) => {
            const dayLabel = date.getDate()
            const dateKey = makeDateKey(date)
            const isFirstColumn = index % 7 === 0
            const isFirstRow = index < 7
            const isLastColumn = (index + 1) % 7 === 0
            const isLastRow = index >= calendarDays.length - 7
            const borderClasses = `${isLastRow ? "" : " border-b"}${isLastColumn ? "" : " border-r"}`
            const cornerClassList: string[] = []

            if (isFirstRow && isFirstColumn) {
              cornerClassList.push("rounded-tl-xl")
            }

            if (isFirstRow && isLastColumn) {
              cornerClassList.push("rounded-tr-xl")
            }

            if (isLastRow && isFirstColumn) {
              cornerClassList.push("rounded-bl-xl")
            }

            if (isLastRow && isLastColumn) {
              cornerClassList.push("rounded-br-xl")
            }

            const cornerClasses = cornerClassList.join(" ")
            const dayMeetings = meetingsByDay.get(dateKey) ?? []
            const visibleMeetings = dayMeetings.slice(0, MONTH_VISIBLE_MEETING_COUNT)
            const hiddenCount = Math.max(0, dayMeetings.length - visibleMeetings.length)
            const today = isToday(date)
            const ariaLabel = `${dayDescriptionFormatter.format(date)}${
              dayMeetings.length > 0 ? `, ${dayMeetings.length} scheduled` : ""
            }`

            return (
              <div
                key={dateKey}
                className={`
                  flex min-h-0 flex-col overflow-hidden border-border p-2 text-sm font-medium transition-all
                  ${borderClasses}
                  ${inCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                  ${today ? "bg-secondary/40" : "ring-inset hover:bg-accent/30"}
                  ${cornerClasses}
                `}
                aria-label={ariaLabel}
              >
                <div className="flex shrink-0 items-start justify-between">
                  <button
                    type="button"
                    className={`
                      inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-sm font-semibold
                      hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                      ${today ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                    `}
                    aria-label={`Open ${dayDescriptionFormatter.format(date)} in day view`}
                    onClick={() => {
                      onSelectDay(date)
                    }}
                  >
                    {dayLabel}
                  </button>
                </div>
                <div className="mt-2 min-h-0 flex-1 overflow-hidden pr-1">
                  <ul className="space-y-1 text-xs">
                    {visibleMeetings.map((meeting) => {
                      const meetingStartLabel = meetingTimeFormatter.format(meeting.meetingDate)
                      const meetingAriaLabel = `${meeting.title} at ${meetingStartLabel}`

                      return (
                        <li key={meeting.id}>
                          <MeetingBlock
                            as="button"
                            meetingTitle={meeting.title}
                            startTimeLabel={meetingStartLabel}
                            startDateTime={meeting.meetingDate.toISOString()}
                            variant={meeting.audioFilePath ? "green" : "default"}
                            aria-label={meetingAriaLabel}
                            onClick={() => {
                              setSelectedMeeting(meeting)
                            }}
                          />
                        </li>
                      )
                    })}
                    {hiddenCount > 0 ? (
                      <li>
                        <CalendarDayPopover
                          date={date}
                          meetings={dayMeetings}
                          open={openDayKey === dateKey}
                          onOpenChange={(open) => {
                            setOpenDayKey(open ? dateKey : null)
                          }}
                          meetingTimeFormatter={meetingTimeFormatter}
                          dayDescriptionFormatter={dayDescriptionFormatter}
                          onMeetingSelect={setSelectedMeeting}
                          onViewDay={onSelectDay}
                          trigger={
                            <button
                              type="button"
                              className="w-full rounded-md px-1.5 py-1 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              +{hiddenCount} more
                            </button>
                          }
                        />
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>
            )
          })}
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
