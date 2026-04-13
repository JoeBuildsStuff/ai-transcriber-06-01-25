"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  MeetingSpeaker,
  MeetingSpeakerWithContact,
  SpeakerAssignmentSource,
  SpeakerIdentifyResponse,
  SpeakerSuggestionSnapshot,
} from "@/types"
import type { Database } from "@/types/supabase"
import { identifySpeakers, storeVoiceProfile } from "@/lib/speaker-id"
import {
  fetchCachedSpeakerSuggestions,
  replaceCachedSpeakerSuggestions,
} from "@/lib/speaker-suggestion-cache"

type ApplyMeetingSpeakerAssignmentArgs =
  Database["ai_transcriber"]["Functions"]["apply_meeting_speaker_assignment"]["Args"]

type ApplyMeetingSpeakerAssignmentRow =
  Database["ai_transcriber"]["Functions"]["apply_meeting_speaker_assignment"]["Returns"][number]

export interface UpdateMeetingSpeakerInput {
  meetingId: string
  speakerIndex: number
  contactId: string | null
  assignmentSource: SpeakerAssignmentSource
  suggestions?: SpeakerSuggestionSnapshot | null
  modelVersion?: string | null
}


export async function updateSpeakerContacts(meetingId: string, speakerContacts: Record<number, string>) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("You must be logged in to update speaker associations.")
  }

  // Validate that all contact IDs exist and belong to the user
  const contactIds = Object.values(speakerContacts).filter(Boolean) as string[]
  if (contactIds.length > 0) {
    const { data: contacts, error: contactsError } = await supabase
      .from('new_contacts')
      .select('id')
      .in('id', contactIds)
      .eq('user_id', userData.user.id)

    if (contactsError) {
      throw new Error(`Failed to validate contacts: ${contactsError.message}`)
    }

    if (!contacts || contacts.length === 0) {
      throw new Error('No valid contacts found')
    }

    const validContactIds = new Set((contacts as { id: string }[]).map(c => c.id))
    const invalidContactIds = contactIds.filter(id => !validContactIds.has(id))
    
    if (invalidContactIds.length > 0) {
      throw new Error('Some contacts do not exist or do not belong to user')
    }
  }

  // Update the meeting record
  const { data, error: updateError } = await supabase
    .schema('ai_transcriber')
    .from('meetings')
    .update({ 
      speaker_names: speakerContacts,
      updated_at: new Date().toISOString()
    })
    .eq('id', meetingId)
    .eq('user_id', userData.user.id)
    .select('id, speaker_names')
    .single()

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      throw new Error('Meeting not found or access denied')
    }
    throw new Error(`Failed to update speaker associations: ${updateError.message}`)
  }

  revalidatePath(`/workspace/meetings/${meetingId}`)
  
  return data.speaker_names
}

export async function updateMeetingSpeaker({
  meetingId,
  speakerIndex,
  contactId,
  assignmentSource,
  suggestions = null,
  modelVersion = null,
}: UpdateMeetingSpeakerInput) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("You must be logged in to update speaker associations.")
  }

  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        name: "apply_meeting_speaker_assignment",
        params: ApplyMeetingSpeakerAssignmentArgs
      ) => Promise<{
        data: ApplyMeetingSpeakerAssignmentRow[] | null
        error: { message: string } | null
      }>
    }
  ).rpc("apply_meeting_speaker_assignment", {
    p_meeting_id: meetingId,
    p_speaker_index: speakerIndex,
    p_contact_id: contactId,
    p_client: "web",
    p_assignment_source: assignmentSource,
    p_suggestions: suggestions as ApplyMeetingSpeakerAssignmentArgs["p_suggestions"],
    p_model_version: modelVersion,
  })

  if (error || !data?.[0]) {
    throw new Error(error?.message ?? "Failed to update speaker association")
  }

  const speakerRow = data[0]

  if (contactId) {
    const { data: meeting } = await supabase
      .schema('ai_transcriber')
      .from('meetings')
      .select('audio_file_path, transcription')
      .eq('id', meetingId)
      .single()

    if (meeting?.audio_file_path && meeting?.transcription) {
      const { data: { session } } = await supabase.auth.getSession()
      storeVoiceProfile({
        audioStoragePath: meeting.audio_file_path,
        contactId,
        meetingId,
        userId: userData.user.id,
        speakerIndex,
        transcription: meeting.transcription as Record<string, unknown>,
        accessToken: session?.access_token,
      }).catch(() => {})
    }
  }

  revalidatePath(`/workspace/meetings/${meetingId}`)

  return speakerRow as MeetingSpeaker
}

export async function getMeetingSpeakerSuggestions(meetingId: string): Promise<SpeakerIdentifyResponse> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("You must be logged in to view speaker suggestions.")
  }

  const cached = await fetchCachedSpeakerSuggestions(supabase, meetingId)
  if (cached) {
    return cached
  }

  const { data: meeting, error } = await supabase
    .schema("ai_transcriber")
    .from("meetings")
    .select("audio_file_path, transcription")
    .eq("id", meetingId)
    .eq("user_id", userData.user.id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load meeting audio for speaker suggestions: ${error.message}`)
  }

  if (!meeting?.audio_file_path || !meeting.transcription) {
    return {
      speakers: [],
      model_version: null,
    }
  }

  const { data: sessionData } = await supabase.auth.getSession()

  try {
    const response = await identifySpeakers({
      audioStoragePath: meeting.audio_file_path,
      userId: userData.user.id,
      transcription: meeting.transcription as Record<string, unknown>,
      accessToken: sessionData.session?.access_token,
    })
    try {
      await replaceCachedSpeakerSuggestions(supabase, meetingId, userData.user.id, response)
    } catch (cacheError) {
      console.error("Failed to save cached speaker suggestions", cacheError)
    }
    return response
  } catch (identifyError) {
    console.error("Failed to load speaker suggestions", identifyError)
    return {
      speakers: [],
      model_version: null,
    }
  }
}

export async function getMeetingSpeakers(meetingId: string): Promise<MeetingSpeakerWithContact[]> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("You must be logged in to view speakers.")
  }

  // Get speakers from meeting_speakers table
  const { data: speakers, error } = await supabase
    .schema('ai_transcriber')
    .from('meeting_speakers')
    .select('id, contact_id, speaker_index, speaker_name')
    .eq('meeting_id', meetingId)
    .order('speaker_index')

  if (error) {
    throw new Error(`Failed to fetch speakers: ${error.message}`)
  }

  const meetingSpeakers = speakers || []

  // Merge saved rows with detected speaker indices from meeting payloads so
  // orphaned diarized speakers remain visible in the UI.
  const { data: meeting } = await supabase
    .schema('ai_transcriber')
    .from('meetings')
    .select('speaker_names, formatted_transcript')
    .eq('id', meetingId)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  const speakerIndices = new Set<number>(meetingSpeakers.map(s => s.speaker_index))

  if (meeting?.speaker_names && typeof meeting.speaker_names === 'object') {
    Object.keys(meeting.speaker_names).forEach((key) => {
      const parsed = Number.parseInt(key, 10)
      if (!Number.isNaN(parsed)) speakerIndices.add(parsed)
    })
  }

  if (Array.isArray(meeting?.formatted_transcript)) {
    for (const row of meeting.formatted_transcript as Array<Record<string, unknown>>) {
      const rawSpeaker = row.speaker
      const parsed = typeof rawSpeaker === 'number'
        ? rawSpeaker
        : typeof rawSpeaker === 'string'
          ? Number.parseInt(rawSpeaker, 10)
          : Number.NaN
      if (!Number.isNaN(parsed)) speakerIndices.add(parsed)
    }
  }

  const existingByIndex = new Map(meetingSpeakers.map(s => [s.speaker_index, s]))
  const mergedSpeakers = Array.from(speakerIndices)
    .sort((a, b) => a - b)
    .map((speakerIndex) => {
      const existing = existingByIndex.get(speakerIndex)
      if (existing) return existing

      return {
        id: `virtual-${meetingId}-${speakerIndex}`,
        contact_id: null,
        speaker_index: speakerIndex,
        speaker_name: `Speaker ${speakerIndex}`,
      }
    })

  return transformSpeakersData(mergedSpeakers, userData.user.id, supabase, meetingId)
}

export async function getMeetingAttendeesWithContacts(meetingId: string) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("You must be logged in to view meeting attendees.")
  }

  const { data: attendees, error } = await supabase
    .schema('ai_transcriber')
    .from('meeting_attendees_with_contacts')
    .select('id, meeting_id, contact_id, invitation_status, attendance_status, first_name, last_name, primary_email, primary_phone, company, job_title')
    .eq('meeting_id', meetingId)
    .eq('user_id', userData.user.id)
    .order('created_at')

  if (error) {
    throw new Error(`Failed to fetch meeting attendees: ${error.message}`)
  }

  return attendees || []
}

// Helper function to transform speaker data
async function transformSpeakersData(
  speakers: { id: string; contact_id: string | null; speaker_index: number; speaker_name: string | null }[], 
  userId: string, 
  supabase: Awaited<ReturnType<typeof createClient>>,
  meetingId: string
): Promise<MeetingSpeakerWithContact[]> {
  // Get contact details for speakers that have contact_id
  const contactIds = speakers.filter(s => s.contact_id).map(s => s.contact_id)
  let contacts: { id: string; first_name: string; last_name: string; display_name: string | null; primary_email: string | null }[] = []
  
  if (contactIds.length > 0) {
    const { data: contactData, error: contactError } = await supabase
      .from('new_contacts')
      .select(`
        id, 
        first_name, 
        last_name,
        emails:new_contact_emails(email, display_order)
      `)
      .in('id', contactIds)

    if (contactError) {
      console.error('Error fetching contacts:', contactError)
    } else {
      // Transform the data to include primary_email
      type ContactWithEmails = {
        id: string
        first_name: string | null
        last_name: string | null
        emails: Array<{ email: string; display_order: number }> | null
      }
      contacts = ((contactData || []) as ContactWithEmails[]).map(contact => {
        const sortedEmails = contact.emails?.sort((a, b) => a.display_order - b.display_order) || []
        const primaryEmail = sortedEmails[0]?.email || ''
        
        return {
          id: contact.id,
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          display_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact',
          primary_email: primaryEmail
        }
      })
    }
  }

  // Transform the data to match our type
  return speakers.map((speaker) => {
    const contact = contacts.find(c => c.id === speaker.contact_id)
    
    return {
      id: speaker.id,
      meeting_id: meetingId, // We know this from the function parameter
      contact_id: speaker.contact_id,
      speaker_index: speaker.speaker_index,
      speaker_name: speaker.speaker_name,
      confidence_score: null,
      role: 'attendee',
      is_primary_speaker: speaker.speaker_index === 0,
      identified_at: null,
      created_at: null,
      updated_at: null,
      contact: contact ? {
        id: contact.id,
        created_at: '',
        updated_at: '',
        user_id: userId,
        first_name: contact.first_name,
        last_name: contact.last_name,
        display_name: contact.display_name,
        primary_email: contact.primary_email,
        company: null,
        job_title: null,
        primary_phone: null,
        birthday: null,
        notes: null,
        is_favorite: false,
        nickname: null,
        tags: null
      } : null
    }
  }) as MeetingSpeakerWithContact[]
}
