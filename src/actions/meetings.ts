"use server"

import { createClient } from "@/lib/supabase/server"
import { Database } from "@/types/supabase"
import { revalidatePath } from "next/cache"

type TagRow = Database["ai_transcriber"]["Tables"]["tags"]["Row"]
type MeetingTagRow = Database["ai_transcriber"]["Tables"]["meeting_tags"]["Row"]

export interface TagAttachmentSummary {
  attached: TagRow[]
  missing: string[]
  error?: string
}

const sanitizeTagName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")

const normalizeTagKey = (value: string) => sanitizeTagName(value).toLowerCase()

export async function attachExistingTagsToMeeting(
  meetingId: string,
  tagNames: string[],
  userId?: string
): Promise<TagAttachmentSummary> {
  if (tagNames.length === 0) {
    return { attached: [], missing: [] }
  }

  const supabase = await createClient()

  const requestedTags = new Map<string, { label: string; sanitized: string }>()
  const missingTags = new Set<string>()

  for (const rawName of tagNames) {
    const trimmed = typeof rawName === "string" ? rawName.trim() : ""
    const sanitized = sanitizeTagName(trimmed)

    if (!sanitized) {
      if (trimmed) {
        missingTags.add(trimmed)
      } else {
        missingTags.add("[empty]")
      }
      continue
    }

    const normalized = sanitized.toLowerCase()
    if (!requestedTags.has(normalized)) {
      requestedTags.set(normalized, {
        label: trimmed || sanitized,
        sanitized,
      })
    }
  }

  if (requestedTags.size === 0) {
    return { attached: [], missing: Array.from(missingTags) }
  }

  let resolvedUserId = userId
  if (!resolvedUserId) {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return {
        attached: [],
        missing: Array.from(missingTags),
        error: "You must be logged in to modify meeting tags.",
      }
    }
    resolvedUserId = user.id
  }

  const { data: userTags, error: fetchError } = await supabase
    .schema("ai_transcriber")
    .from("tags")
    .select("id, name, description, created_at, updated_at")
    .eq("user_id", resolvedUserId)

  if (fetchError) {
    console.error("Failed to fetch tags for attachment:", fetchError.message)
    requestedTags.forEach((value) => missingTags.add(value.label))
    return {
      attached: [],
      missing: Array.from(missingTags),
      error: "Unable to load tags while attaching to meeting.",
    }
  }

  const existingTagMap = new Map<string, TagRow>()
  for (const tag of userTags ?? []) {
    const normalized = normalizeTagKey(tag.name)
    if (normalized) {
      existingTagMap.set(normalized, tag)
    }
  }

  const matchedTags: TagRow[] = []
  requestedTags.forEach((value, key) => {
    const match = existingTagMap.get(key)
    if (match) {
      matchedTags.push(match)
    } else {
      missingTags.add(value.label)
    }
  })

  let attachmentError: string | undefined
  if (matchedTags.length > 0) {
    const tagIds = matchedTags.map((tag) => tag.id)
    const attachResult = await addTagsToMeeting(meetingId, tagIds)
    if (attachResult.error) {
      attachmentError = attachResult.error
    }
  }

  return {
    attached: matchedTags,
    missing: Array.from(missingTags),
    error: attachmentError,
  }
}

// Helper function to find contact by first and last name
// used by the LLM Agent to add attendees to a meeting
// right now the llm specifies a first name + last name and we search for that contact and adds the first contact found
// TODO: in the future we should search for the contact by email
async function findContactByName(firstName: string, lastName: string, userId: string) {
  const supabase = await createClient()
  
  const { data: contacts, error } = await supabase
    .schema("ai_transcriber")
    .from("new_contacts")
    .select("id, first_name, last_name")
    .eq("user_id", userId)
    .eq("first_name", firstName)
    .eq("last_name", lastName)
    .limit(1)
    .single()

  if (error) {
    return null
  }

  return contacts
}

export async function createMeeting(params?: {
  title?: string
  meeting_at?: string
  meeting_end_at?: string
  description?: string
  location?: string
  participants?: Array<{ firstName: string; lastName: string }>
  tags?: string[]
}) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return {
      error: "You must be logged in to create a meeting.",
    }
  }

  const meetingData = {
    user_id: userData.user.id,
    title: params?.title || "Untitled Meeting",
    audio_file_path: "", // Required field, but no file yet.
    meeting_at: params?.meeting_at || new Date().toISOString(),
    meeting_end_at: params?.meeting_end_at || null,
    location: params?.location || null,
  }

  const { data: newMeeting, error } = await supabase
    .schema("ai_transcriber")
    .from("meetings")
    .insert(meetingData)
    .select("id, title, meeting_at, meeting_end_at, location")
    .single()

  if (error) {
    console.error("Error creating meeting:", error.message)
    return {
      error: "Failed to create meeting in the database.",
    }
  }

  // Create a note entry with optional description as content
  const noteData = {
    user_id: userData.user.id,
    title: "Meeting Notes",
    content: params?.description || null,
  }

  const { data: newNote, error: noteError } = await supabase
    .schema("ai_transcriber")
    .from("notes")
    .insert(noteData)
    .select("id")
    .single()

  if (noteError) {
    console.error("Error creating note:", noteError.message)
    return {
      error: "Failed to create note in the database.",
    }
  }

  // Create a meeting_notes entry linking the meeting to the note
  const meetingNoteData = {
    meeting_id: newMeeting.id,
    note_id: newNote.id,
    user_id: userData.user.id,
  }

  const { error: meetingNoteError } = await supabase
    .schema("ai_transcriber")
    .from("meeting_notes")
    .insert(meetingNoteData)

  if (meetingNoteError) {
    console.error("Error creating meeting note link:", meetingNoteError.message)
    return {
      error: "Failed to link meeting to note in the database.",
    }
  }

  // Add participants if provided
  // Helper function to find contact by first and last name
  // used by the LLM Agent to add attendees to a meeting
  // right now the llm specifies a first name + last name and we search for that contact and adds the first contact found
  // TODO: in the future we should search for the contact by email
  const addedParticipants: Array<{ name: string; contactId: string | null; found: boolean }> = []
  if (params?.participants && params.participants.length > 0) {
    const participantResults = await Promise.all(
      params.participants.map(async (participant) => {
        const contact = await findContactByName(participant.firstName, participant.lastName, userData.user.id)
        
        if (contact) {
          return {
            name: `${participant.firstName} ${participant.lastName}`,
            contactId: contact.id,
            found: true
          }
        } else {
          return {
            name: `${participant.firstName} ${participant.lastName}`,
            contactId: null,
            found: false
          }
        }
      })
    )
    
    addedParticipants.push(...participantResults)
    
    const participantContactIds = participantResults
      .filter(p => p.found)
      .map(p => p.contactId!)
      .filter(Boolean)

    // Add found participants to the meeting
    if (participantContactIds.length > 0) {
      const attendeesToInsert = participantContactIds.map(contactId => ({
        meeting_id: newMeeting.id,
        contact_id: contactId,
        user_id: userData.user.id,
        invitation_status: 'invited' as const,
        attendance_status: 'unknown' as const,
        role: 'attendee' as const,
      }))

      const { error: attendeeError } = await supabase
        .schema("ai_transcriber")
        .from("meeting_attendees")
        .insert(attendeesToInsert)

      if (attendeeError) {
        console.error("Error adding participants:", attendeeError.message)
        // Don't fail the entire operation, just log the error
      }
    }
  }

  let tagSummary: TagAttachmentSummary | undefined
  if (params?.tags && params.tags.length > 0) {
    tagSummary = await attachExistingTagsToMeeting(newMeeting.id, params.tags, userData.user.id)
  }

  revalidatePath("/workspace/meetings")
  revalidatePath("/workspace")

  return {
    data: "Meeting created successfully",
    meeting: newMeeting,
    note: newNote,
    participants: addedParticipants,
    tags: tagSummary ?? { attached: [], missing: [] }
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

export async function getMeetingNote(meetingId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: "You must be logged in to fetch meeting notes." }
  }

  try {
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
        // No note found for this meeting
        return { data: null }
      }
      return { error: meetingNoteError.message }
    }

    if (!meetingNote) {
      return { data: null }
    }

    // Then, get the actual note content
    const { data: note, error: noteError } = await supabase
      .schema("ai_transcriber")
      .from("notes")
      .select("id, title, content, created_at, updated_at")
      .eq("id", meetingNote.note_id)
      .eq("user_id", user.id)
      .single()

    if (noteError) {
    return { error: noteError.message }
  }

  return { data: note }
  } catch (error) {
    console.error('Error fetching meeting note:', error)
    return { error: "An unexpected error occurred" }
  }
}

export async function getAllTags() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  if (!userData.user) {
    throw new Error("You must be logged in to view tags.")
  }

  const { data, error } = await supabase
    .schema("ai_transcriber")
    .from("tags")
    .select("id, name, description, created_at, updated_at")
    .eq("user_id", userData.user.id)
    .order("name", { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`)
  }

  return (data ?? []) as TagRow[]
}

export async function getMeetingTags(meetingId: string) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  if (!userData.user) {
    throw new Error("You must be logged in to view meeting tags.")
  }

  const { data, error } = await supabase
    .schema("ai_transcriber")
    .from("meeting_tags")
    .select("id, meeting_id, tag:tags(id, name, description, created_at, updated_at)")
    .eq("meeting_id", meetingId)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch meeting tags: ${error.message}`)
  }

  const rows = (data ?? []) as Array<MeetingTagRow & { tag: TagRow | null }>
  return rows
    .map((row) => row.tag)
    .filter((tag): tag is TagRow => Boolean(tag))
}

export async function addTagsToMeeting(meetingId: string, tagIds: string[]) {
  if (tagIds.length === 0) {
    return { data: [], message: "No tags to add." }
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "You must be logged in to modify meeting tags." }
  }

  const { data: existingRows, error: existingError } = await supabase
    .schema("ai_transcriber")
    .from("meeting_tags")
    .select("tag_id")
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .in("tag_id", tagIds)

  if (existingError) {
    return { error: existingError.message }
  }

  const existingIds = new Set((existingRows ?? []).map((row) => row.tag_id))
  const newIds = tagIds.filter((id) => !existingIds.has(id))

  if (newIds.length === 0) {
    return { data: [], message: "All selected tags are already attached." }
  }

  const payload = newIds.map((tagId) => ({
    meeting_id: meetingId,
    tag_id: tagId,
    user_id: user.id,
  }))

  const { data: inserted, error: insertError } = await supabase
    .schema("ai_transcriber")
    .from("meeting_tags")
    .insert(payload)
    .select("tag:tags(id, name, description, created_at, updated_at)")

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/workspace/meetings/${meetingId}`)

  const attachedTags = ((inserted ?? []) as Array<{ tag: TagRow | null }>).map((row) => row.tag).filter((tag): tag is TagRow => Boolean(tag))

  return {
    data: attachedTags,
    message: `${attachedTags.length} tag(s) added successfully.`,
  }
}

export async function removeTagsFromMeeting(meetingId: string, tagIds: string[]) {
  if (tagIds.length === 0) {
    return { data: "No tags removed." }
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "You must be logged in to modify meeting tags." }
  }

  const { error } = await supabase
    .schema("ai_transcriber")
    .from("meeting_tags")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .in("tag_id", tagIds)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/workspace/meetings/${meetingId}`)

  return {
    data: "Tags removed successfully",
    message: `${tagIds.length} tag(s) removed.`,
  }
}

export async function createAndAttachTag(meetingId: string, rawName: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: "You must be logged in to create tags." }
  }

  const name = sanitizeTagName(rawName)

  if (!name) {
    return { error: "Tag name cannot be empty." }
  }

  const { data: existingTag, error: existingError } = await supabase
    .schema("ai_transcriber")
    .from("tags")
    .select("id, name, description, created_at, updated_at")
    .eq("user_id", user.id)
    .ilike("name", name)
    .maybeSingle()

  if (existingError && existingError.code !== "PGRST116") {
    return { error: existingError.message }
  }

  const tag = existingTag as TagRow | null

  if (tag) {
    const result = await addTagsToMeeting(meetingId, [tag.id])
    if (result.error) {
      return result
    }
    return { data: tag, created: false }
  }

  const { data: newTag, error: insertError } = await supabase
    .schema("ai_transcriber")
    .from("tags")
    .insert({ name, user_id: user.id })
    .select("id, name, description, created_at, updated_at")
    .single()

  if (insertError || !newTag) {
    return { error: insertError?.message || "Failed to create tag." }
  }

  const attachResult = await addTagsToMeeting(meetingId, [newTag.id])
  if (attachResult.error) {
    return { error: attachResult.error }
  }

  return {
    data: newTag as TagRow,
    created: true,
  }
}
