"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { MeetingSpeaker, MeetingSpeakerWithContact } from "@/types"
import { Database } from "@/types/supabase"

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

    const validContactIds = new Set(contacts.map(c => c.id))
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

export async function updateMeetingSpeaker(meetingId: string, speakerIndex: number, contactId: string | null) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("You must be logged in to update speaker associations.")
  }

  // For now, let's create a simplified version that works with the existing structure
  // We'll use a hybrid approach - update meeting_speakers table and also keep speaker_names in sync

  const now = new Date().toISOString()
  
  // First, check if meeting_speakers entry exists for this speaker
  const { data: existingSpeaker } = await supabase
    .from('meeting_speakers')
    .select('*')
    .eq('meeting_id', meetingId)
    .eq('speaker_index', speakerIndex)
    .maybeSingle()

  let speakerName = `Speaker ${speakerIndex}`
  
  // Get contact name if contactId is provided
  if (contactId) {
    const { data: contact } = await supabase
      .from('new_contacts')
      .select('first_name, last_name')
      .eq('id', contactId)
      .eq('user_id', userData.user.id)
      .single()

    if (contact) {
      speakerName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || `Speaker ${speakerIndex}`
    }
  }

  // Update or insert meeting_speakers record
  if (existingSpeaker) {
    const { error: updateError } = await supabase
      .from('meeting_speakers')
      .update({
        contact_id: contactId,
        speaker_name: speakerName,
        updated_at: now
      })
      .eq('id', existingSpeaker.id)

    if (updateError) {
      throw new Error(`Failed to update speaker: ${updateError.message}`)
    }
  } else {
    const { error: insertError } = await supabase
      .from('meeting_speakers')
      .insert({
        meeting_id: meetingId,
        contact_id: contactId,
        speaker_index: speakerIndex,
        speaker_name: speakerName,
        role: 'attendee',
        is_primary_speaker: speakerIndex === 0,
        identified_at: now,
        created_at: now,
        updated_at: now
      })

    if (insertError) {
      throw new Error(`Failed to create speaker: ${insertError.message}`)
    }
  }

  revalidatePath(`/workspace/meetings/${meetingId}`)
  
  // Return the updated speaker data
  return {
    id: existingSpeaker?.id || '',
    meeting_id: meetingId,
    contact_id: contactId,
    speaker_index: speakerIndex,
    speaker_name: speakerName,
    confidence_score: null,
    role: 'attendee',
    is_primary_speaker: speakerIndex === 0,
    identified_at: now,
    created_at: existingSpeaker?.created_at || now,
    updated_at: now
  } as MeetingSpeaker
}

export async function getMeetingSpeakers(meetingId: string): Promise<MeetingSpeakerWithContact[]> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("You must be logged in to view speakers.")
  }

  // Get speakers from meeting_speakers table
  const { data: speakers, error } = await supabase
    .from('meeting_speakers')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('speaker_index')

  if (error) {
    throw new Error(`Failed to fetch speakers: ${error.message}`)
  }

  // If no speakers exist in meeting_speakers table, try to create them from the meeting's speaker_names
  if (!speakers || speakers.length === 0) {
    console.log(`No speakers found in meeting_speakers table for meeting ${meetingId}, checking speaker_names...`)
    
    // Get the meeting to check speaker_names
    const { data: meeting } = await supabase
      .schema('ai_transcriber')
      .from('meetings')
      .select('speaker_names')
      .eq('id', meetingId)
      .eq('user_id', userData.user.id)
      .single()

         if (meeting?.speaker_names) {
       const speakerNumbers = Object.keys(meeting.speaker_names).map(k => parseInt(k, 10)).sort((a, b) => a - b)
       
       // Create meeting_speakers rows for each speaker
       for (const speakerIndex of speakerNumbers) {
         try {
           await updateMeetingSpeaker(meetingId, speakerIndex, null)
         } catch (error) {
           console.error(`Failed to create speaker row for speaker ${speakerIndex}:`, error)
         }
       }
      
      // Retry fetching speakers
      const { data: newSpeakers } = await supabase
        .from('meeting_speakers')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('speaker_index')
      
      if (newSpeakers) {
        return transformSpeakersData(newSpeakers, userData.user.id, supabase)
      }
    }
    
    return []
  }

  return transformSpeakersData(speakers, userData.user.id, supabase)
}

// Helper function to transform speaker data
async function transformSpeakersData(
  speakers: Database['ai_transcriber']['Tables']['meeting_speakers']['Row'][], 
  userId: string, 
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<MeetingSpeakerWithContact[]> {
  // Get contact details for speakers that have contact_id
  const contactIds = speakers.filter(s => s.contact_id).map(s => s.contact_id)
  let contacts: { id: string; first_name: string; last_name: string; job_title: string; is_favorite: boolean }[] = []
  
  if (contactIds.length > 0) {
    const { data: contactData, error: contactError } = await supabase
      .from('new_contacts')
      .select('id, first_name, last_name, job_title, is_favorite')
      .in('id', contactIds)

    if (contactError) {
      console.error('Error fetching contacts:', contactError)
    } else {
      contacts = contactData || []
    }
  }

  // Transform the data to match our type
  return speakers.map((speaker) => {
    const contact = contacts.find(c => c.id === speaker.contact_id)
    
    return {
      id: speaker.id,
      meeting_id: speaker.meeting_id,
      contact_id: speaker.contact_id,
      speaker_index: speaker.speaker_index,
      speaker_name: speaker.speaker_name,
      confidence_score: speaker.confidence_score,
      role: speaker.role,
      is_primary_speaker: speaker.is_primary_speaker,
      identified_at: speaker.identified_at,
      created_at: speaker.created_at,
      updated_at: speaker.updated_at,
      contact: contact ? {
        id: contact.id,
        created_at: '',
        updated_at: '',
        user_id: userId,
        first_name: contact.first_name,
        last_name: contact.last_name,
        display_name: null,
        primary_email: null,
        company: null,
        job_title: contact.job_title,
        primary_phone: null,
        birthday: null,
        notes: null,
        is_favorite: contact.is_favorite,
        nickname: null,
        tags: null
      } : null
    }
  }) as MeetingSpeakerWithContact[]
}


