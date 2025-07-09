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

// Meeting Attendees Management Functions
export async function getMeetingAttendees(meetingId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: "You must be logged in to view attendees." }
  }

  try {
    const { data: attendees, error } = await supabase
      .schema("ai_transcriber")
      .from("meeting_attendees")
      .select(`
        id,
        contact_id,
        invitation_status,
        attendance_status,
        role,
        invited_at,
        responded_at,
        notes,
        new_contacts (
          id,
          first_name,
          last_name,
          job_title,
          new_companies (
            name
          ),
          new_contact_emails (
            email,
            display_order
          )
        )
      `)
      .eq("meeting_id", meetingId)

    if (error) {
      return { error: error.message }
    }

    return { data: attendees }
  } catch (error) {
    console.error('Error fetching meeting attendees:', error)
    return { error: "An unexpected error occurred" }
  }
}

export async function addMeetingAttendees(meetingId: string, contactIds: string[]) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: "You must be logged in to add attendees." }
  }

  try {
    // RLS policies will automatically ensure the user can only access their own data
    // No need for manual user_id checks since the database enforces this

    // Check for existing attendees to avoid duplicates
    const { data: existingAttendees, error: existingError } = await supabase
      .schema("ai_transcriber")
      .from("meeting_attendees")
      .select("contact_id")
      .eq("meeting_id", meetingId)
      .in("contact_id", contactIds)

    if (existingError) {
      return { error: "Error checking existing attendees." }
    }

    const existingContactIds = existingAttendees.map(a => a.contact_id)
    const newContactIds = contactIds.filter(id => !existingContactIds.includes(id))

    if (newContactIds.length === 0) {
      return { error: "All selected contacts are already attendees." }
    }

    // Insert new attendees
    const attendeesToInsert = newContactIds.map(contactId => ({
      meeting_id: meetingId,
      contact_id: contactId,
      user_id: user.id,
      invitation_status: 'invited' as const,
      attendance_status: 'unknown' as const,
      role: 'attendee' as const,
    }))

    const { data: newAttendees, error: insertError } = await supabase
      .schema("ai_transcriber")
      .from("meeting_attendees")
      .insert(attendeesToInsert)
      .select()

    if (insertError) {
      return { error: insertError.message }
    }

    revalidatePath(`/workspace/meetings/${meetingId}`)
    return { 
      data: newAttendees,
      message: `${newContactIds.length} attendee(s) added successfully.`
    }
  } catch (error) {
    console.error('Error adding meeting attendees:', error)
    return { error: "An unexpected error occurred" }
  }
}

export async function removeMeetingAttendees(meetingId: string, attendeeIds: string[]) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: "You must be logged in to remove attendees." }
  }

  try {
    const { error } = await supabase
      .schema("ai_transcriber")
      .from("meeting_attendees")
      .delete()
      .in("id", attendeeIds)
      .eq("meeting_id", meetingId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath(`/workspace/meetings/${meetingId}`)
    return { 
      data: "Attendees removed successfully",
      message: `${attendeeIds.length} attendee(s) removed.`
    }
  } catch (error) {
    console.error('Error removing meeting attendees:', error)
    return { error: "An unexpected error occurred" }
  }
}

export async function updateAttendeeStatus(
  attendeeId: string, 
  updates: {
    invitation_status?: 'invited' | 'accepted' | 'declined' | 'tentative' | 'no_response'
    attendance_status?: 'present' | 'absent' | 'unknown'
    role?: 'organizer' | 'required' | 'optional' | 'attendee'
    notes?: string
  }
) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: "You must be logged in to update attendee status." }
  }

  try {
    const { data, error } = await supabase
      .schema("ai_transcriber")
      .from("meeting_attendees")
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq("id", attendeeId)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Error updating attendee status:', error)
    return { error: "An unexpected error occurred" }
  }
}



