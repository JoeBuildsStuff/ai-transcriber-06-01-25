"use client"

import MeetingContentLoader from "@/app/(workspace)/workspace/meetings/[id]/_components/meeting-content-loader"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

import { type DayMeeting } from "./hooks/use-calendar-meetings"

type CalendarMeetingDetailsSheetProps = {
  meeting: DayMeeting | null
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
  onClose: () => void
}


export const CalendarMeetingDetailsSheet = ({
  meeting,
  meetingTimeFormatter,
  dayDescriptionFormatter,
  onClose,
}: CalendarMeetingDetailsSheetProps) => (
  <Sheet
    open={meeting !== null}
    onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}
  >
    <SheetContent side="right" className="w-full sm:max-w-5xl p-0">
      {meeting ? (
        <MeetingPageSheetContent
          meeting={meeting}
          meetingTimeFormatter={meetingTimeFormatter}
          dayDescriptionFormatter={dayDescriptionFormatter}
        />
  ) : null}
    </SheetContent>
  </Sheet>
)

type MeetingPageSheetContentProps = {
  meeting: DayMeeting
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
}

const MeetingPageSheetContent = ({
  meeting,
  meetingTimeFormatter,
  dayDescriptionFormatter,
}: MeetingPageSheetContentProps) => {
  return (
    <>
      <SheetHeader className="sr-only">
        <SheetTitle>{meeting.title}</SheetTitle>
        <SheetDescription>
          {`${dayDescriptionFormatter.format(meeting.meetingDate)} - ${meetingTimeFormatter.format(meeting.meetingDate)} to ${meetingTimeFormatter.format(meeting.meetingEndDate)}`}
        </SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-hidden">
        <MeetingContentLoader id={meeting.id} variant="sheet" />
      </div>
    </>
  )
}
