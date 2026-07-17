import type { MeetingSummary } from "../types/meetings"

export type MeetingRow = {
  id: string
  title: string | null
  meeting_at: string | null
  meeting_end_at: string | null
  audio_file_path: string | null
  original_file_name: string | null
  created_at: string | null
}

export const mapMeetingRows = (rows: MeetingRow[]): MeetingSummary[] =>
  rows.map((meeting) => ({
    id: meeting.id,
    title: meeting.title || "Untitled Meeting",
    meetingAt: meeting.meeting_at || meeting.created_at || new Date().toISOString(),
    meetingEndAt: meeting.meeting_end_at,
    audioFilePath: meeting.audio_file_path,
    originalFileName: meeting.original_file_name,
  }))
