"use server"

import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"

const newContactSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  nickname: z.string().optional(),
  primary_email: z.string().email().optional().or(z.literal("")),
  primary_phone: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  birthday: z.string().optional(),
  notes: z.string().optional(),
  is_favorite: z.coerce.boolean().default(false).optional(),
  tags: z.string().optional(),
})

const updateContactSchema = newContactSchema.extend({
  id: z.string(),
})

export async function createContact(formData: FormData) {
  const supabase = await createClient()

  const rawData = {
    first_name: formData.get("first_name") ? formData.get("first_name") as string : undefined,
    last_name: formData.get("last_name") ? formData.get("last_name") as string : undefined,
    nickname: formData.get("nickname") ? formData.get("nickname") as string : undefined,
    primary_email: formData.get("primary_email") ? formData.get("primary_email") as string : undefined,
    primary_phone: formData.get("primary_phone") ? formData.get("primary_phone") as string : undefined,
    company: formData.get("company") ? formData.get("company") as string : undefined,
    job_title: formData.get("job_title") ? formData.get("job_title") as string : undefined,
    birthday: formData.get("birthday") ? formData.get("birthday") as string : undefined,
    notes: formData.get("notes") ? formData.get("notes") as string : undefined,
    is_favorite: formData.get("is_favorite"),
    tags: formData.get("tags") ? formData.get("tags") as string : undefined,
  }

  const validatedFields = newContactSchema.safeParse(rawData)

  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors)
    return {
      error: "Invalid fields",
    }
  }

  const { tags, ...contactData } = validatedFields.data
  const tagsArray = tags
    ? tags.split(",").map((tag) => tag.trim())
    : undefined

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return {
      error: "You must be logged in to create a contact.",
    }
  }

  const { data: newContact, error } = await supabase
    .schema("ai_transcriber")
    .from("contacts")
    .insert({ ...contactData, tags: tagsArray, user_id: userData.user.id })
    .select()
    .single()

  if (error) {
    return {
      error: error.message,
    }
  }

  revalidatePath("/workspace/contacts")

  return {
    data: "Contact created successfully",
    contact: newContact,
  }
}

export async function updateContact(formData: FormData) {
  const supabase = await createClient()

  const rawData = {
    id: formData.get("id") as string,
    first_name: formData.get("first_name") ? formData.get("first_name") as string : undefined,
    last_name: formData.get("last_name") ? formData.get("last_name") as string : undefined,
    nickname: formData.get("nickname") ? formData.get("nickname") as string : undefined,
    primary_email: formData.get("primary_email") ? formData.get("primary_email") as string : undefined,
    primary_phone: formData.get("primary_phone") ? formData.get("primary_phone") as string : undefined,
    company: formData.get("company") ? formData.get("company") as string : undefined,
    job_title: formData.get("job_title") ? formData.get("job_title") as string : undefined,
    birthday: formData.get("birthday") ? formData.get("birthday") as string : undefined,
    notes: formData.get("notes") ? formData.get("notes") as string : undefined,
    is_favorite: formData.get("is_favorite"),
    tags: formData.get("tags") ? formData.get("tags") as string : undefined,
  }

  const validatedFields = updateContactSchema.safeParse(rawData)

  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors)
    return {
      error: "Invalid fields",
    }
  }

  const { id, tags, ...contactData } = validatedFields.data
  const tagsArray = tags
    ? tags.split(",").map((tag) => tag.trim())
    : undefined

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return {
      error: "You must be logged in to update a contact.",
    }
  }

  const { data: updatedContact, error } = await supabase
    .schema("ai_transcriber")
    .from("contacts")
    .update({ ...contactData, tags: tagsArray })
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .select()
    .single()

  if (error) {
    return {
      error: error.message,
    }
  }

  revalidatePath("/workspace/contacts")
  revalidatePath(`/workspace/contacts/${id}`)

  return {
    data: "Contact updated successfully",
    contact: updatedContact,
  }
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return {
      error: "You must be logged in to delete a contact.",
    }
  }

  const { error } = await supabase
    .schema("ai_transcriber")
    .from("contacts")
    .delete()
    .eq('id', contactId)
    .eq('user_id', userData.user.id)

  if (error) {
    return {
      error: error.message,
    }
  }

  revalidatePath("/workspace/contacts")

  return {
    data: "Contact deleted successfully",
  }
}

export async function deleteMultipleContacts(contactIds: string[]) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return {
      error: "You must be logged in to delete contacts.",
    }
  }

  const { error } = await supabase
    .schema("ai_transcriber")
    .from("contacts")
    .delete()
    .in('id', contactIds)
    .eq('user_id', userData.user.id)

  if (error) {
    return {
      error: error.message,
    }
  }

  revalidatePath("/workspace/contacts")

  return {
    data: `${contactIds.length} contact(s) deleted successfully`,
  }
}

export async function duplicateContact(contactId: string) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return {
      error: "You must be logged in to duplicate a contact.",
    }
  }

  // First, fetch the original contact
  const { data: originalContact, error: fetchError } = await supabase
    .schema("ai_transcriber")
    .from("contacts")
    .select('*')
    .eq('id', contactId)
    .eq('user_id', userData.user.id)
    .single()

  if (fetchError || !originalContact) {
    return {
      error: "Contact not found or you don't have permission to duplicate it.",
    }
  }

  // Create a new contact based on the original, extracting only the fields we want to copy
  const contactData = {
    first_name: originalContact.first_name,
    last_name: originalContact.last_name,
    nickname: originalContact.nickname,
    primary_email: originalContact.primary_email,
    primary_phone: originalContact.primary_phone,
    company: originalContact.company,
    job_title: originalContact.job_title,
    birthday: originalContact.birthday,
    notes: originalContact.notes,
    is_favorite: originalContact.is_favorite,
    tags: originalContact.tags,
  }

  // Modify the data to indicate it's a copy
  const duplicatedData = {
    ...contactData,
    // Set user_id to current user
    user_id: userData.user.id
  }

  const { data: newContact, error: createError } = await supabase
    .schema("ai_transcriber")
    .from("contacts")
    .insert(duplicatedData)
    .select('*')
    .single()

  if (createError) {
    return {
      error: createError.message,
    }
  }

  revalidatePath("/workspace/contacts")

  return {
    data: "Contact duplicated successfully",
    newContact: newContact
  }
}

export async function getContactById(contactId: string) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("You must be logged in to view contacts.")
  }

  const { data: contact, error } = await supabase
    .schema("ai_transcriber")
    .from("contacts")
    .select('*')
    .eq('id', contactId)
    .eq('user_id', userData.user.id)
    .single()

  if (error || !contact) {
    throw new Error("Contact not found or you don't have permission to view it.")
  }

  // Transform snake_case to camelCase for frontend
  return {
    id: contact.id,
    firstName: contact.first_name || '',
    lastName: contact.last_name || '',
    displayName: contact.display_name || '',
    nickname: contact.nickname || '',
    primaryEmail: contact.primary_email || '',
    primaryPhone: contact.primary_phone || '',
    company: contact.company || '',
    jobTitle: contact.job_title || '',
    birthday: contact.birthday || '',
    notes: contact.notes || '',
    isFavorite: contact.is_favorite || false,
    tags: contact.tags || [],
    createdAt: contact.created_at,
    updatedAt: contact.updated_at,
    userId: contact.user_id
  }
}

export async function getAllContacts() {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    throw new Error("You must be logged in to view contacts.")
  }

  const { data: contacts, error } = await supabase
    .schema("ai_transcriber")
    .from("contacts")
    .select(`
      id,
      first_name,
      last_name, 
      display_name,
      primary_email,
      company,
      notes
    `)
    .eq('user_id', userData.user.id)
    .order('display_name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch contacts: ${error.message}`)
  }

  return contacts.map(contact => ({
    id: contact.id,
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    display_name: contact.display_name || '',
    primary_email: contact.primary_email || '',
    company: contact.company || '',
    notes: contact.notes || '',
  }))
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

