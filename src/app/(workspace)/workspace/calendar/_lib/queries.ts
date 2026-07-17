import { createClient } from "@/lib/supabase/server"
import { mapMeetingRows, type MeetingRow } from "@/components/calendar/lib/map-meeting-rows"
import type { MeetingSummary } from "@/components/calendar/types/meetings"

/** PostgREST/Supabase default max rows; paginate past it so dense ranges aren't truncated. */
const CALENDAR_PAGE_SIZE = 1000

type GetMeetingsForCalendarArgs = {
  from: Date
  to: Date
}

const MEETING_SELECT = `
  id,
  title,
  meeting_at,
  meeting_end_at,
  audio_file_path,
  original_file_name,
  created_at
`

async function fetchMeetingPages(
  buildQuery: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any
  ) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
): Promise<MeetingRow[]> {
  const supabase = await createClient()
  const rows: MeetingRow[] = []

  for (let offset = 0; ; offset += CALENDAR_PAGE_SIZE) {
    const pageEnd = offset + CALENDAR_PAGE_SIZE - 1
    const baseQuery = supabase
      .schema("ai_transcriber")
      .from("meetings")
      .select(MEETING_SELECT)

    const { data, error } = await buildQuery(baseQuery)
      .order("meeting_at", { ascending: true, nullsFirst: false })
      .range(offset, pageEnd)

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

  return rows
}

export async function getMeetingsForCalendar({
  from,
  to,
}: GetMeetingsForCalendarArgs): Promise<MeetingSummary[]> {
  const fromIso = from.toISOString()
  const toIso = to.toISOString()

  const [datedMeetings, undatedMeetings] = await Promise.all([
    fetchMeetingPages((query) => query.gte("meeting_at", fromIso).lt("meeting_at", toIso)),
    fetchMeetingPages((query) =>
      query.is("meeting_at", null).gte("created_at", fromIso).lt("created_at", toIso)
    ),
  ])

  const byId = new Map<string, MeetingRow>()
  for (const row of [...datedMeetings, ...undatedMeetings]) {
    byId.set(row.id, row)
  }

  const merged = Array.from(byId.values()).sort((left, right) => {
    const leftAt = left.meeting_at || left.created_at || ""
    const rightAt = right.meeting_at || right.created_at || ""
    return leftAt.localeCompare(rightAt)
  })

  return mapMeetingRows(merged)
}
