import { createClient } from "@/lib/supabase/server"
import { MeetingSummary } from "@/components/calendar/types/meetings"

export async function getMeetingsForCalendar(): Promise<MeetingSummary[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .schema("ai_transcriber")
    .from("meetings")
    .select(`
      id,
      title,
      meeting_at,
      meeting_end_at,
      audio_file_path,
      original_file_name,
      created_at
    `)
    .order("meeting_at", { ascending: true })

  if (error) {
    console.error("Error fetching meetings for calendar:", error)
    return []
  }

  // Transform the data to match the MeetingSummary interface
  const meetings: MeetingSummary[] = (data || []).map(meeting => ({
    id: meeting.id,
    title: meeting.title || "Untitled Meeting",
    meetingAt: meeting.meeting_at || meeting.created_at || new Date().toISOString(),
    meetingEndAt: meeting.meeting_end_at,
    audioFilePath: meeting.audio_file_path,
    originalFileName: meeting.original_file_name,
  }))

  return meetings
}
