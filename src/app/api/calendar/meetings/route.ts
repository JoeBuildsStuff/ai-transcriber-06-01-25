import { NextResponse } from "next/server"

import { getMeetingsForCalendar } from "@/app/(workspace)/workspace/calendar/_lib/queries"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 })
  }

  const from = new Date(fromParam)
  const to = new Date(toParam)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid from/to timestamps" }, { status: 400 })
  }

  if (from >= to) {
    return NextResponse.json({ error: "from must be before to" }, { status: 400 })
  }

  const meetings = await getMeetingsForCalendar({ from, to })
  return NextResponse.json({ meetings })
}
