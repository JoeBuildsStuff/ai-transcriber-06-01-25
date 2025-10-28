export interface MeetingSummary {
  id: string
  title: string
  meetingAt: string
  meetingEndAt: string | null
  audioFilePath: string | null
  originalFileName: string | null
}

// Re-export for convenience
export type { MeetingSummary as CalendarMeetingSummary }
