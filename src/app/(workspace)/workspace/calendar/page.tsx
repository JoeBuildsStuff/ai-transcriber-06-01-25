import { Calendar } from "@/components/calendar/calendar"
import { getMeetingsForCalendar } from "./_lib/queries"


export default async function CalendarPage() {
  const meetings = await getMeetingsForCalendar()

  return (
        <Calendar meetings={meetings} />
  )
}
