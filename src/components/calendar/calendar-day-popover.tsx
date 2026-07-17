"use client"

import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { type DayMeeting } from "./hooks/use-calendar-meetings"
import { MeetingBlock } from "./meeting-block"

type CalendarDayPopoverProps = {
  date: Date
  meetings: DayMeeting[]
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
  onMeetingSelect: (meeting: DayMeeting) => void
  onViewDay: (date: Date) => void
  trigger: ReactNode
}

export const CalendarDayPopover = ({
  date,
  meetings,
  open,
  onOpenChange,
  meetingTimeFormatter,
  dayDescriptionFormatter,
  onMeetingSelect,
  onViewDay,
  trigger,
}: CalendarDayPopoverProps) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
    <PopoverContent align="start" className="w-80 p-0" sideOffset={6}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{dayDescriptionFormatter.format(date)}</p>
          <p className="text-xs text-muted-foreground">
            {meetings.length} {meetings.length === 1 ? "meeting" : "meetings"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onViewDay(date)
            onOpenChange(false)
          }}
        >
          Day view
        </Button>
      </div>
      <ul className="max-h-72 space-y-1 overflow-y-auto p-2">
        {meetings.map((meeting) => {
          const meetingStartLabel = meetingTimeFormatter.format(meeting.meetingDate)
          return (
            <li key={meeting.id}>
              <MeetingBlock
                as="button"
                meetingTitle={meeting.title}
                startTimeLabel={meetingStartLabel}
                startDateTime={meeting.meetingDate.toISOString()}
                variant={meeting.audioFilePath ? "green" : "default"}
                onClick={() => {
                  onMeetingSelect(meeting)
                  onOpenChange(false)
                }}
              />
            </li>
          )
        })}
      </ul>
    </PopoverContent>
  </Popover>
)
