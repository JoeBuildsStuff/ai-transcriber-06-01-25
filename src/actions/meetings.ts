"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createMeeting() {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return {
      error: "You must be logged in to create a meeting.",
    }
  }

  const meetingData = {
    user_id: userData.user.id,
    title: "Untitled Meeting",
    audio_file_path: "", // Required field, but no file yet.
    meeting_at: new Date().toISOString(),
  }

  const { data: newMeeting, error } = await supabase
    .schema("ai_transcriber")
    .from("meetings")
    .insert(meetingData)
    .select("id")
    .single()

  if (error) {
    console.error("Error creating meeting:", error.message)
    return {
      error: "Failed to create meeting in the database.",
    }
  }

  revalidatePath("/workspace/meetings")
  revalidatePath("/workspace")

  return {
    data: "Meeting created successfully",
    meeting: newMeeting,
  }
}

// src/actions/meetings.ts
export async function updateMeetingNotes(meetingId: string, notes: string) {
  'use server'
  
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: "You must be logged in to update notes." }
  }

  try {
    const { error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .update({ 
        user_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", meetingId)
      .eq("user_id", user.id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/workspace/meetings/${meetingId}`)
    return { data: "Notes updated successfully" }
  } catch (error) {
    console.error('Error updating meeting notes:', error)
    return { error: "An unexpected error occurred" }
  }
}



