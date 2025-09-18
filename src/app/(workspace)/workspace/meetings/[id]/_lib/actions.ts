"use server"

import { createClient } from "@/lib/supabase/server"
import { MeetingRecurrence, Meetings } from "./validations"
import { PostgrestError } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

type MeetingRecurrenceInput = {
  frequency: MeetingRecurrence["frequency"]
  interval: number
  weekdays: string[] | null
  monthly_option: MeetingRecurrence["monthly_option"]
  monthly_day_of_month: number | null
  monthly_weekday: string | null
  monthly_weekday_position: number | null
  end_type: MeetingRecurrence["end_type"]
  end_date: string | null
  occurrence_count: number | null
  starts_at: string
  timezone: string
}

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
    .select(`
      id,
      user_id,
      audio_file_path,
      original_file_name,
      formatted_transcript,
      summary,
      created_at,
      updated_at,
      title,
      meeting_at,
      speaker_names,
      summary_jsonb,
      meeting_reviewed,
      location,
      recurrence:meeting_recurrences (
        id,
        frequency,
        interval,
        weekdays,
        monthly_option,
        monthly_day_of_month,
        monthly_weekday,
        monthly_weekday_position,
        end_type,
        end_date,
        occurrence_count,
        starts_at,
        timezone,
        created_at,
        updated_at
      )
    `)
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

export async function upsertMeetingRecurrence(meetingId: string, input: MeetingRecurrenceInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for updating recurrence")
    return { success: false, error: "User not authenticated" }
  }

  try {
    const { data: meeting, error: meetingError } = await supabase
      .schema("ai_transcriber")
      .from("meetings")
      .select("id")
      .eq("id", meetingId)
      .eq("user_id", user.id)
      .single()

    if (meetingError || !meeting) {
      console.error("Meeting not found or access denied for recurrence upsert", meetingError)
      return { success: false, error: "Meeting not found" }
    }

    const { data, error } = await supabase
      .schema("ai_transcriber")
      .from("meeting_recurrences")
      .upsert([
        {
          meeting_id: meetingId,
          frequency: input.frequency,
          interval: input.interval,
          weekdays: input.weekdays,
          monthly_option: input.monthly_option,
          monthly_day_of_month: input.monthly_day_of_month,
          monthly_weekday: input.monthly_weekday,
          monthly_weekday_position: input.monthly_weekday_position,
          end_type: input.end_type,
          end_date: input.end_date,
          occurrence_count: input.occurrence_count,
          starts_at: input.starts_at,
          timezone: input.timezone
        }
      ], { onConflict: "meeting_id" })
      .select()
      .single()

    if (error) {
      console.error("Error upserting meeting recurrence:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/workspace/meetings/${meetingId}`)
    return { success: true, data }
  } catch (error) {
    console.error("Unexpected error upserting meeting recurrence:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteMeetingRecurrence(meetingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error("User not authenticated for deleting recurrence")
    return { success: false, error: "User not authenticated" }
  }

  try {
    const { error } = await supabase
      .schema("ai_transcriber")
      .from("meeting_recurrences")
      .delete()
      .eq("meeting_id", meetingId)

    if (error) {
      console.error("Error deleting meeting recurrence:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/workspace/meetings/${meetingId}`)
    return { success: true }
  } catch (error) {
    console.error("Unexpected error deleting meeting recurrence:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
