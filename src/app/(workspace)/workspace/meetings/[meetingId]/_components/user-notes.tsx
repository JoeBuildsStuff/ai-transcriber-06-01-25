"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import NotesContent from "../../../notes/[id]/_components/notes-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircleIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Note {
  id: string
  title: string | null
  content: string | null
  created_at: string | null
  updated_at: string | null
}

export default function UserNotes({ meetingId }: { meetingId: string }) {
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMeetingNote() {
      try {
        setLoading(true)
        setError(null)
        
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          setError("You must be logged in to fetch meeting notes.")
          return
        }

        // First, get the note_id from the meeting_notes junction table
        const { data: meetingNote, error: meetingNoteError } = await supabase
          .schema("ai_transcriber")
          .from("meeting_notes")
          .select("note_id")
          .eq("meeting_id", meetingId)
          .eq("user_id", user.id)
          .single()

        if (meetingNoteError) {
          if (meetingNoteError.code === 'PGRST116') {
            // No note found for this meeting - this is normal for new meetings
            setNote(null)
            return
          }
          setError(meetingNoteError.message)
          return
        }

        if (!meetingNote) {
          setNote(null)
          return
        }

        // Then, get the actual note content
        const { data: noteData, error: noteError } = await supabase
          .schema("ai_transcriber")
          .from("notes")
          .select("id, title, content, created_at, updated_at")
          .eq("id", meetingNote.note_id)
          .eq("user_id", user.id)
          .single()

        if (noteError) {
          setError(noteError.message)
          return
        }

        setNote(noteData)
      } catch (err) {
        console.error('Error fetching meeting note:', err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchMeetingNote()
  }, [meetingId])

  if (loading) {
    return (
      <Skeleton className="h-full w-full" />
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Error loading notes.</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <NotesContent 
        noteId={note?.id || ""} 
        noteContent={note?.content || ""} 
        onNoteIdChange={() => {}} 
      />
    </div>

  )
}