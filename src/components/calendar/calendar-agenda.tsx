"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"

import { CalendarMeetingDetailsSheet } from "./calendar-meeting-details-sheet"
import { type DayMeeting, makeDateKey } from "./hooks/use-calendar-meetings"
import { MeetingBlock } from "./meeting-block"
import { isSameCalendarDay } from "./lib/calendar-url"

type CalendarAgendaProps = {
  meetingsByDay: Map<string, DayMeeting[]>
  currentDate: Date
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
  isToday: (date: Date) => boolean
  onSelectDay: (date: Date) => void
}

export const CalendarAgenda = ({
  meetingsByDay,
  currentDate,
  meetingTimeFormatter,
  dayDescriptionFormatter,
  isToday,
  onSelectDay,
}: CalendarAgendaProps) => {
  const [selectedMeeting, setSelectedMeeting] = useState<DayMeeting | null>(null)

  const agendaDays = useMemo(() => {
    const start = new Date(currentDate)
    start.setHours(0, 0, 0, 0)

    const days: { date: Date; meetings: DayMeeting[] }[] = []

    for (let offset = 0; offset < 60; offset += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + offset)
      const meetings = meetingsByDay.get(makeDateKey(date)) ?? []
      const isFocusedDay = isSameCalendarDay(date, currentDate)

      if (meetings.length === 0 && !isFocusedDay) {
        continue
      }

      days.push({
        date,
        meetings: [...meetings].sort(
          (left, right) => left.meetingDate.getTime() - right.meetingDate.getTime()
        ),
      })
    }

    if (days.length === 0) {
      days.push({ date: start, meetings: [] })
    }

    return days
  }, [currentDate, meetingsByDay])

  return (
    <>
      <div className="h-full min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-border">
        <div className="divide-y divide-border">
          {agendaDays.map(({ date, meetings }) => {
            const dateKey = makeDateKey(date)
            const today = isToday(date)

            return (
              <section key={dateKey} className="grid grid-cols-[10rem_minmax(0,1fr)] gap-4 p-4">
                <div className="sticky top-0 self-start">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`h-auto w-full flex-col items-start gap-0.5 px-2 py-1 text-left ${
                      today ? "text-primary" : "text-foreground"
                    }`}
                    onClick={() => {
                      onSelectDay(date)
                    }}
                  >
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {dayDescriptionFormatter.format(date).split(",")[0]}
                    </span>
                    <span className="text-sm font-semibold">
                      {date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </Button>
                </div>
                <div className="min-w-0 space-y-2">
                  {meetings.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">No meetings</p>
                  ) : (
                    meetings.map((meeting) => {
                      const meetingStartLabel = meetingTimeFormatter.format(meeting.meetingDate)
                      const durationMinutes = Math.max(
                        1,
                        Math.ceil(
                          (meeting.meetingEndDate.getTime() - meeting.meetingDate.getTime()) /
                            60000
                        )
                      )

                      return (
                        <MeetingBlock
                          key={meeting.id}
                          as="button"
                          meetingTitle={meeting.title}
                          startTimeLabel={meetingStartLabel}
                          durationLabel={`${durationMinutes} min`}
                          startDateTime={meeting.meetingDate.toISOString()}
                          variant={meeting.audioFilePath ? "green" : "default"}
                          onClick={() => {
                            setSelectedMeeting(meeting)
                          }}
                        />
                      )
                    })
                  )}
                </div>
              </section>
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
