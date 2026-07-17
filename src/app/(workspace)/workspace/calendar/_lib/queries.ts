import { createClient } from "@/lib/supabase/server"
import { MeetingSummary } from "@/components/calendar/types/meetings"

/** PostgREST/Supabase default max rows; paginate past it so newer meetings aren't dropped. */
const CALENDAR_PAGE_SIZE = 1000

type MeetingRow = {
  id: string
  title: string | null
  meeting_at: string | null
  meeting_end_at: string | null
  audio_file_path: string | null
  original_file_name: string | null
  created_at: string | null
}

export async function getMeetingsForCalendar(): Promise<MeetingSummary[]> {
  const supabase = await createClient()
  const rows: MeetingRow[] = []

  for (let from = 0; ; from += CALENDAR_PAGE_SIZE) {
    const to = from + CALENDAR_PAGE_SIZE - 1
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
      .range(from, to)

    if (error) {
      console.error("Error fetching meetings for calendar:", error)
      return []
    }

    if (!data?.length) {
      break
    }

    rows.push(...(data as MeetingRow[]))

    if (data.length < CALENDAR_PAGE_SIZE) {
      break
    }
  }

  return rows.map((meeting) => ({
    id: meeting.id,
    title: meeting.title || "Untitled Meeting",
    meetingAt: meeting.meeting_at || meeting.created_at || new Date().toISOString(),
    meetingEndAt: meeting.meeting_end_at,
    audioFilePath: meeting.audio_file_path,
    originalFileName: meeting.original_file_name,
  }))
}
