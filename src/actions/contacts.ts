"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { MeetingSpeaker, MeetingSpeakerWithContact } from "@/types"


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
    .select('id, contact_id, speaker_index, speaker_name')
    .eq('meeting_id', meetingId)
    .order('speaker_index')

  if (error) {
    throw new Error(`Failed to fetch speakers: ${error.message}`)
  }

  // If no speakers exist in meeting_speakers table, try to create them from the meeting's speaker_names
  if (!speakers || speakers.length === 0) {
    console.log(`No speakers found in meeting_speakers table for meeting ${meetingId}, checking speaker_names...`)
    
    // Get the meeting to check speaker_names
    //TODO: This is likely not needed anymore since refactoring
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
        .select('id, contact_id, speaker_index, speaker_name')
        .eq('meeting_id', meetingId)
        .order('speaker_index')
      
      if (newSpeakers) {
        return transformSpeakersData(newSpeakers, userData.user.id, supabase, meetingId)
      }
    }
    
    return []
  }

  return transformSpeakersData(speakers, userData.user.id, supabase, meetingId)
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
      contacts = (contactData || []).map(contact => {
        const sortedEmails = contact.emails?.sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order) || []
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


