import { Suspense } from "react"

import { Calendar } from "@/components/calendar/calendar"
import { getCalendarFetchRange } from "@/components/calendar/lib/calendar-range"
import {
  formatCalendarDateParam,
  parseCalendarDateParam,
  parseCalendarViewParam,
} from "@/components/calendar/lib/calendar-url"

import { getMeetingsForCalendar } from "./_lib/queries"

type CalendarPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const readParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams
  const view = parseCalendarViewParam(readParam(params.view)) ?? "month"
  const date =
    parseCalendarDateParam(readParam(params.date)) ?? new Date()
  const { from, to } = getCalendarFetchRange(view, date)
  const meetings = await getMeetingsForCalendar({ from, to })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading calendar…</div>}>
        <Calendar
          initialMeetings={meetings}
          initialView={view}
          initialDate={formatCalendarDateParam(date)}
        />
      </Suspense>
    </div>
  )
}
