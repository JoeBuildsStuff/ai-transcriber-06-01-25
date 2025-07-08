"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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
      .schema('ai_transcriber')
      .from('contacts')
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


