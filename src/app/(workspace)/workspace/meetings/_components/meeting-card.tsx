'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import Link from "next/link"
import type { Meeting } from "../../page"
import { useEffect, useState } from "react"

interface MeetingCardProps {
  meeting: Meeting
}

export default function MeetingCard({ meeting }: MeetingCardProps) {
  const [displayTime, setDisplayTime] = useState({
    date: '',
    time: '',
    relative: ''
  });

  useEffect(() => {
    const meetingDate = parseISO(meeting.meeting_at);
    setDisplayTime({
      date: format(meetingDate, "MMMM do, yyyy"),
      time: format(meetingDate, "p"),
      relative: `(${formatDistanceToNow(meetingDate, { addSuffix: true })})`
    });
  }, [meeting.meeting_at]);

  if (!displayTime.date) {
    // Render a skeleton or a placeholder to avoid layout shift
    // and prevent hydration errors.
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <CardTitle className="truncate">
                    {meeting.title || meeting.original_file_name || "Untitled Meeting"}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted-foreground/20" />
                </div>
                {meeting.summary && (
                <div className="mt-4 space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted-foreground/20" />
                </div>
                )}
            </CardContent>
        </Card>
    );
  }

  return (
    <Link href={`/workspace/meetings/${meeting.id}`}>
      <Card className="flex h-full cursor-pointer flex-col transition-colors hover:bg-accent">
        <CardHeader>
          <CardTitle className="truncate">
            {meeting.title || meeting.original_file_name || "Untitled Meeting"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{displayTime.date}</p>
            <div className="flex items-center gap-2">
              <span>{displayTime.time}</span>
              <span className="text-xs">{displayTime.relative}</span>
            </div>
          </div>
          {meeting.summary && (
            <p className="line-clamp-3 mt-4 text-sm text-foreground">
              {meeting.summary}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
} 