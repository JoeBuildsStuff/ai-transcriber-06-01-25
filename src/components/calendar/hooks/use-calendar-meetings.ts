import { useMemo } from "react"

import type { MeetingSummary } from "../types/meetings"

export const DEFAULT_MEETING_DURATION_MINUTES = 60

export type DayMeeting = {
  id: string
  meetingDate: Date
  meetingEndDate: Date
  title: string
  audioFilePath: string | null
  originalFileName: string | null
}

export const makeDateKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

export const useCalendarMeetings = (meetings: MeetingSummary[]) => {
  const meetingsByDay = useMemo(() => {
    const meetingMap = new Map<string, DayMeeting[]>()

    for (const meeting of meetings) {
      const meetingDate = new Date(meeting.meetingAt)

      if (Number.isNaN(meetingDate.getTime())) {
        continue
      }

      const meetingEndDate = getMeetingEndDate(meetingDate, meeting.meetingEndAt)
      const dateKey = makeDateKey(meetingDate)
      const meetingEntry: DayMeeting = {
        id: meeting.id,
        meetingDate,
        meetingEndDate,
        title: meeting.title,
        audioFilePath: meeting.audioFilePath,
        originalFileName: meeting.originalFileName,
      }

      const existingMeetings = meetingMap.get(dateKey)

      if (!existingMeetings) {
        meetingMap.set(dateKey, [meetingEntry])
        continue
      }

      existingMeetings.push(meetingEntry)
    }

    return meetingMap
  }, [meetings])

  const meetingTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  )

  const dayDescriptionFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
      }),
    []
  )

  return { meetingsByDay, meetingTimeFormatter, dayDescriptionFormatter }
}
const getMeetingEndDate = (startDate: Date, meetingEndAt: string | null) => {
  if (meetingEndAt) {
    const parsedEndDate = new Date(meetingEndAt)

    if (!Number.isNaN(parsedEndDate.getTime()) && parsedEndDate.getTime() > startDate.getTime()) {
      return parsedEndDate
    }
  }

  const fallbackEndDate = new Date(startDate)
  fallbackEndDate.setMinutes(startDate.getMinutes() + DEFAULT_MEETING_DURATION_MINUTES)
  return fallbackEndDate
}

