"use client"

import { useState } from "react"


import { type CalendarDay } from "./hooks/use-calendar-days"
import { type DayMeeting, makeDateKey } from "./hooks/use-calendar-meetings"
import { CalendarMeetingDetailsSheet } from "./calendar-meeting-details-sheet"
import { MeetingBlock } from "./meeting-block"

type CalendarMonthGridProps = {
  calendarDays: CalendarDay[]
  meetingsByDay: Map<string, DayMeeting[]>
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
  isToday: (date: Date) => boolean
}

export const CalendarMonthGrid = ({
  calendarDays,
  meetingsByDay,
  meetingTimeFormatter,
  dayDescriptionFormatter,
  isToday,
}: CalendarMonthGridProps) => {
  const [selectedMeeting, setSelectedMeeting] = useState<DayMeeting | null>(null)

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-7">
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
            const ariaLabel = `${dayDescriptionFormatter.format(date)}${
              dayMeetings.length > 0 ? `, ${dayMeetings.length} scheduled` : ""
            }`

            return (
              <div
                key={dateKey}
                className={`
                  flex flex-col border-border p-2 text-sm font-medium transition-all
                  ${borderClasses}
                  ${inCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                  ${
                    isToday(date)
                      ? "bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90"
                      : "ring-inset hover:bg-accent/30"
                  }
                  ${cornerClasses}
                `}
                aria-label={ariaLabel}
              >
                <span className="flex items-start justify-between text-sm font-semibold">
                  {dayLabel}
                </span>
                <div className="mt-2 flex-1 overflow-auto pr-1">
                  <MonthMeetingList
                    meetings={dayMeetings}
                    meetingTimeFormatter={meetingTimeFormatter}
                    onMeetingSelect={setSelectedMeeting}
                  />
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

type MonthMeetingListProps = {
  meetings: DayMeeting[]
  meetingTimeFormatter: Intl.DateTimeFormat
  onMeetingSelect: (meeting: DayMeeting) => void
}

const MonthMeetingList = ({
  meetings,
  meetingTimeFormatter,
  onMeetingSelect,
}: MonthMeetingListProps) => (
  <ul className="space-y-1 text-xs">
    {meetings.map((meeting) => {
      const meetingStartLabel = meetingTimeFormatter.format(meeting.meetingDate)
      const ariaLabel = `${meeting.title} at ${meetingStartLabel}`

      return (
        <li key={meeting.id}>
          <MeetingBlock
            as="button"
            meetingTitle={meeting.title}
            startTimeLabel={meetingStartLabel}
            startDateTime={meeting.meetingDate.toISOString()}
            variant={meeting.audioFilePath ? "green" : "default"}
            aria-label={ariaLabel}
            onClick={() => {
              onMeetingSelect(meeting)
            }}
          />
        </li>
      )
    })}
  </ul>
)
