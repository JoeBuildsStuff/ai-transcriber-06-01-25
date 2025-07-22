"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { Note } from "./validations"
import { getContacts as dbGetContacts, getMeetings as dbGetMeetings } from "./queries"

interface NoteWithAssociations extends Omit<Note, "id" | "created_at" | "updated_at"> {
  contactIds?: string[]
  meetingIds?: string[]
}

export async function createNote(data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user to set user_id for RLS policy
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract associations from the data
    const { contactIds, meetingIds, ...noteData } = data as unknown as NoteWithAssociations
    
    // Include user_id in the note data
    const noteDataWithUserId = {
      ...noteData,
      user_id: user.id
    }

    // Start a transaction by creating the note first
    const { data: newNote, error: noteError } = await supabase
      .from("notes")
      .insert([noteDataWithUserId])
      .select()
      .single()
    
    if (noteError) {
      console.error("Error creating note:", noteError)
      return { success: false, error: noteError.message }
    }
    
    // Create contact associations if provided
    if (contactIds && contactIds.length > 0) {
      const contactNotesToInsert = contactIds.map(contactId => ({
        note_id: newNote.id,
        contact_id: contactId,
        user_id: user.id
      }))
      
      const { error: contactNoteError } = await supabase
        .from("contact_notes")
        .insert(contactNotesToInsert)
      
      if (contactNoteError) {
        console.error("Error creating contact associations:", contactNoteError)
        // Rollback by deleting the note
        await supabase.from("notes").delete().eq("id", newNote.id)
        return { success: false, error: contactNoteError.message }
      }
    }
    
    // Create meeting associations if provided
    if (meetingIds && meetingIds.length > 0) {
      const meetingNotesToInsert = meetingIds.map(meetingId => ({
        note_id: newNote.id,
        meeting_id: meetingId,
        user_id: user.id
      }))
      
      const { error: meetingNoteError } = await supabase
        .from("meeting_notes")
        .insert(meetingNotesToInsert)
      
      if (meetingNoteError) {
        console.error("Error creating meeting associations:", meetingNoteError)
        // Rollback by deleting the note and contact associations
        await supabase.from("notes").delete().eq("id", newNote.id)
        if (contactIds && contactIds.length > 0) {
          await supabase.from("contact_notes").delete().eq("note_id", newNote.id)
        }
        return { success: false, error: meetingNoteError.message }
      }
    }
    
    revalidatePath("/notes")
    return { success: true, data: newNote }
  } catch (error) {
    console.error("Unexpected error creating note:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateNote(id: string, data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract associations from the data
    const { contactIds, meetingIds, ...noteData } = data as unknown as NoteWithAssociations
    
    // Update the note
    const { data: updatedNote, error: noteError } = await supabase
      .from("notes")
      .update(noteData)
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user can only update their own notes
      .select()
      .single()
    
    if (noteError) {
      console.error("Error updating note:", noteError)
      return { success: false, error: noteError.message }
    }
    
    // Update contact associations if provided
    if (contactIds !== undefined) {
      // Delete existing contact associations for this note
      const { error: deleteContactNoteError } = await supabase
        .from("contact_notes")
        .delete()
        .eq("note_id", id)
        .eq("user_id", user.id)
      
      if (deleteContactNoteError) {
        console.error("Error deleting existing contact associations:", deleteContactNoteError)
        return { success: false, error: deleteContactNoteError.message }
      }
      
      // Insert new contact associations
      if (contactIds.length > 0) {
        const contactNotesToInsert = contactIds.map(contactId => ({
          note_id: id,
          contact_id: contactId,
          user_id: user.id
        }))
        
        const { error: contactNoteError } = await supabase
          .from("contact_notes")
          .insert(contactNotesToInsert)
        
        if (contactNoteError) {
          console.error("Error creating contact associations:", contactNoteError)
          return { success: false, error: contactNoteError.message }
        }
      }
    }
    
    // Update meeting associations if provided
    if (meetingIds !== undefined) {
      // Delete existing meeting associations for this note
      const { error: deleteMeetingNoteError } = await supabase
        .from("meeting_notes")
        .delete()
        .eq("note_id", id)
        .eq("user_id", user.id)
      
      if (deleteMeetingNoteError) {
        console.error("Error deleting existing meeting associations:", deleteMeetingNoteError)
        return { success: false, error: deleteMeetingNoteError.message }
      }
      
      // Insert new meeting associations
      if (meetingIds.length > 0) {
        const meetingNotesToInsert = meetingIds.map(meetingId => ({
          note_id: id,
          meeting_id: meetingId,
          user_id: user.id
        }))
        
        const { error: meetingNoteError } = await supabase
          .from("meeting_notes")
          .insert(meetingNotesToInsert)
        
        if (meetingNoteError) {
          console.error("Error creating meeting associations:", meetingNoteError)
          return { success: false, error: meetingNoteError.message }
        }
      }
    }
    
    revalidatePath("/notes")
    return { success: true, data: updatedNote }
  } catch (error) {
    console.error("Unexpected error updating note:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getContacts() {
  return await dbGetContacts()
}

export async function getMeetings() {
  return await dbGetMeetings()
}

export async function multiUpdateNotes(noteIds: string[], data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract associations from the data
    const { contactIds, meetingIds, ...noteData } = data as unknown as NoteWithAssociations
    
    // Only process fields that are actually provided (not undefined)
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(noteData).filter(([, value]) => value !== undefined)
    )
    
    // Update all notes with the provided data
    if (Object.keys(fieldsToUpdate).length > 0) {
      const { error: noteError } = await supabase
        .from("notes")
        .update(fieldsToUpdate)
        .in("id", noteIds)
        .eq("user_id", user.id) // Ensure user can only update their own notes
      
      if (noteError) {
        console.error("Error multi updating notes:", noteError)
        return { success: false, error: noteError.message }
      }
    }
    
    // Handle multi contact association updates if provided
    if (contactIds !== undefined) {
      // Delete existing contact associations for all notes for this user
      const { error: deleteContactNoteError } = await supabase
        .from("contact_notes")
        .delete()
        .in("note_id", noteIds)
        .eq("user_id", user.id)
      
      if (deleteContactNoteError) {
        console.error("Error deleting existing contact associations:", deleteContactNoteError)
        return { success: false, error: deleteContactNoteError.message }
      }
      
      // Insert new contact associations for all notes
      if (contactIds.length > 0) {
        const contactNotesToInsert = noteIds.flatMap(noteId =>
          contactIds.map(contactId => ({
            note_id: noteId,
            contact_id: contactId,
            user_id: user.id
          }))
        )
        
        const { error: contactNoteError } = await supabase
          .from("contact_notes")
          .insert(contactNotesToInsert)
        
        if (contactNoteError) {
          console.error("Error creating contact associations:", contactNoteError)
          return { success: false, error: contactNoteError.message }
        }
      }
    }
    
    // Handle multi meeting association updates if provided
    if (meetingIds !== undefined) {
      // Delete existing meeting associations for all notes for this user
      const { error: deleteMeetingNoteError } = await supabase
        .from("meeting_notes")
        .delete()
        .in("note_id", noteIds)
        .eq("user_id", user.id)
      
      if (deleteMeetingNoteError) {
        console.error("Error deleting existing meeting associations:", deleteMeetingNoteError)
        return { success: false, error: deleteMeetingNoteError.message }
      }
      
      // Insert new meeting associations for all notes
      if (meetingIds.length > 0) {
        const meetingNotesToInsert = noteIds.flatMap(noteId =>
          meetingIds.map(meetingId => ({
            note_id: noteId,
            meeting_id: meetingId,
            user_id: user.id
          }))
        )
        
        const { error: meetingNoteError } = await supabase
          .from("meeting_notes")
          .insert(meetingNotesToInsert)
        
        if (meetingNoteError) {
          console.error("Error creating meeting associations:", meetingNoteError)
          return { success: false, error: meetingNoteError.message }
        }
      }
    }
    
    revalidatePath("/notes")
    return { success: true, updatedCount: noteIds.length }
  } catch (error) {
    console.error("Unexpected error multi updating notes:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteNotes(noteIds: string[]) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Delete related contact associations first (due to foreign key constraints)
    const { error: contactNoteError } = await supabase
      .from("contact_notes")
      .delete()
      .in("note_id", noteIds)
      .eq("user_id", user.id)
    
    if (contactNoteError) {
      console.error("Error deleting contact associations:", contactNoteError)
      return { success: false, error: contactNoteError.message }
    }
    
    // Delete related meeting associations
    const { error: meetingNoteError } = await supabase
      .from("meeting_notes")
      .delete()
      .in("note_id", noteIds)
      .eq("user_id", user.id)
    
    if (meetingNoteError) {
      console.error("Error deleting meeting associations:", meetingNoteError)
      return { success: false, error: meetingNoteError.message }
    }
    
    // Now delete the notes
    const { error } = await supabase
      .from("notes")
      .delete()
      .in("id", noteIds)
      .eq("user_id", user.id) // Ensure user can only delete their own notes
    
    if (error) {
      console.error("Error deleting notes:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/notes")
    return { success: true, deletedCount: noteIds.length }
  } catch (error) {
    console.error("Unexpected error deleting notes:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
