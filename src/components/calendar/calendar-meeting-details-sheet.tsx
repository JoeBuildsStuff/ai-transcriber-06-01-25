"use client"

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

import { type DayMeeting } from "./hooks/use-calendar-meetings"
import { ItemContent, ItemDescription, ItemTitle, Item } from "@/components/ui/item"

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
    <SheetContent side="right">
      {meeting ? (
        <MeetingDetailsContent
          meeting={meeting}
          meetingTimeFormatter={meetingTimeFormatter}
          dayDescriptionFormatter={dayDescriptionFormatter}
        />
      ) : null}
    </SheetContent>
  </Sheet>
)

type MeetingDetailsContentProps = {
  meeting: DayMeeting
  meetingTimeFormatter: Intl.DateTimeFormat
  dayDescriptionFormatter: Intl.DateTimeFormat
}

const MeetingDetailsContent = ({
  meeting,
  meetingTimeFormatter,
  dayDescriptionFormatter,
}: MeetingDetailsContentProps) => {
  return (
    <>
      <SheetHeader>
        <SheetTitle>{meeting.title}</SheetTitle>
        <SheetDescription>
          {`${dayDescriptionFormatter.format(meeting.meetingDate)} - ${meetingTimeFormatter.format(meeting.meetingDate)} to ${meetingTimeFormatter.format(meeting.meetingEndDate)}`}
        </SheetDescription>
      </SheetHeader>
      <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2">
        <p>
          Start: {dayDescriptionFormatter.format(meeting.meetingDate)} at {meetingTimeFormatter.format(meeting.meetingDate)}
        </p>
        <p>
          End: {dayDescriptionFormatter.format(meeting.meetingEndDate)} at {meetingTimeFormatter.format(meeting.meetingEndDate)}
        </p>
        {meeting.audioFilePath && (
          <div className="pt-2">
            <Item variant="green" size="sm">
              <ItemContent>
                <ItemTitle>Audio File Available</ItemTitle>
                <ItemDescription>Path: {meeting.audioFilePath}</ItemDescription>
                <ItemDescription>Original file: {meeting.originalFileName}</ItemDescription>
              </ItemContent>
            </Item>
          </div>
        )}
      </div>
    </>
  )
}
