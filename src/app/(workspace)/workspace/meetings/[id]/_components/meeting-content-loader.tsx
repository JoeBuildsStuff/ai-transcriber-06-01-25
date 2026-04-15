'use client'

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { getMeeting } from "@/app/(workspace)/workspace/meetings/[id]/_lib/actions"
import { getMeetingTags } from "@/actions/meetings"
import {
  getMeetingAttendeesWithContacts,
  getMeetingSpeakerSuggestions,
  getMeetingSpeakers,
} from "@/actions/contacts"
import type { Meetings } from "@/app/(workspace)/workspace/meetings/[id]/_lib/validations"
import type {
  MeetingAttendeeViewData,
  MeetingSpeakerWithContact,
  SpeakerIdentifyResponse,
  Tag,
} from "@/types"

import MeetingContent from "./meeting-content"
import MeetingIdSkeleton from "./skeleton"

type MeetingContentLoaderProps = {
  id: string
  variant?: "page" | "sheet"
}

export default function MeetingContentLoader({
  id,
  variant = "page",
}: MeetingContentLoaderProps) {
  const router = useRouter()
  const [meetingData, setMeetingData] = useState<Meetings | null>(null)
  const [meetingSpeakers, setMeetingSpeakers] = useState<MeetingSpeakerWithContact[]>([])
  const [meetingAttendees, setMeetingAttendees] = useState<MeetingAttendeeViewData[]>([])
  const [meetingTags, setMeetingTags] = useState<Tag[]>([])
  const [speakerSuggestions, setSpeakerSuggestions] = useState<SpeakerIdentifyResponse>({
    speakers: [],
    model_version: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMeetingData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [meeting, speakers, attendees, tags, suggestions] = await Promise.all([
        getMeeting(id),
        getMeetingSpeakers(id),
        getMeetingAttendeesWithContacts(id),
        getMeetingTags(id),
        getMeetingSpeakerSuggestions(id),
      ])

      if (!meeting?.data) {
        setError("Meeting not found")
        setMeetingData(null)
        return
      }

      setMeetingData(meeting.data)
      setMeetingSpeakers(speakers)
      setMeetingAttendees(attendees)
      setMeetingTags(tags)
      setSpeakerSuggestions(suggestions)
    } catch (err) {
      setError("Failed to load meeting data")
      console.error("Error loading meeting data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadMeetingData()
  }, [loadMeetingData])

  const handleUploadSuccess = useCallback(() => {
    router.refresh()
    void loadMeetingData()
  }, [loadMeetingData, router])

  if (isLoading) {
    return <MeetingIdSkeleton />
  }

  if (error || !meetingData) {
    return <div>{error || "Meeting not found"}</div>
  }

  return (
    <MeetingContent
      id={id}
      meetingData={meetingData}
      meetingSpeakers={meetingSpeakers}
      speakerSuggestions={speakerSuggestions}
      meetingAttendees={meetingAttendees}
      meetingTags={meetingTags}
      onUploadSuccess={handleUploadSuccess}
      variant={variant}
    />
  )
}
