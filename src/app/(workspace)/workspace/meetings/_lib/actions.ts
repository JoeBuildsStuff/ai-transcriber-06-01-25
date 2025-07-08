"use server"

import { createClient } from "@/lib/supabase/server"
import { Meetings } from "./validations"
import { PostgrestError } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function getMeeting(
  id: string
): Promise<{
  data: Meetings | null
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("ai_transcriber")
    .from("meetings")
    .select("id, user_id, audio_file_path, original_file_name, formatted_transcript, summary, created_at, updated_at, title, meeting_at, speaker_names, summary_jsonb, meeting_reviewed, user_notes")
    .eq("id", id)
    .single()

  return { data: data as Meetings | null, error }
}

export async function createMeeting(data: Omit<Meetings, "id" | "created_at" | "updated_at" | "user_id">) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for creating meeting")
    return { success: false, error: "User not authenticated" }
  }
  
  try {
    const { data: newMeeting, error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .insert([{ ...data, user_id: user.id, audio_file_path: data.audio_file_path || "" }])
      .select()
      .single()
    
    if (error) {
      console.error("Error creating meeting:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/workspace/meetings")
    return { success: true, data: newMeeting }
  } catch (error) {
    console.error("Unexpected error creating meeting:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateMeeting(id: string, data: Partial<Omit<Meetings, "id" | "created_at" | "updated_at">>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for updating meeting")
    return { success: false, error: "User not authenticated" }
  }
  
  try {
    const { data: updatedMeeting, error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating meeting:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/workspace/meetings")
    revalidatePath(`/workspace/meetings/${id}`)
    return { success: true, data: updatedMeeting }
  } catch (error) {
    console.error("Unexpected error updating meeting:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function multiUpdateMeetings(meetingIds: string[], data: Partial<Omit<Meetings, "id" | "created_at" | "updated_at">>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for multi updating meetings")
    return { success: false, error: "User not authenticated" }
  }
  
  try {
    // Only process fields that are actually provided (not undefined)
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    )
    
    if (Object.keys(fieldsToUpdate).length === 0) {
      return { success: true, updatedCount: 0 }
    }
    
    const { error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .update(fieldsToUpdate)
      .in("id", meetingIds)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error multi updating meetings:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/workspace/meetings")
    // Revalidate individual meeting pages
    meetingIds.forEach(id => revalidatePath(`/workspace/meetings/${id}`))
    
    return { success: true, updatedCount: meetingIds.length }
  } catch (error) {
    console.error("Unexpected error multi updating meetings:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteMeetings(meetingIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for deleting meetings")
    return { success: false, error: "User not authenticated" }
  }
  
  try {
    const { error } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .delete()
      .in("id", meetingIds)
      .eq("user_id", user.id)
    
    if (error) {
      console.error("Error deleting meetings:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/workspace/meetings")
    return { success: true, deletedCount: meetingIds.length }
  } catch (error) {
    console.error("Unexpected error deleting meetings:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
