"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { Contacts } from "./validations"

export async function createContact(data: Omit<Contacts, "id" | "created_at" | "updated_at">) {
  const supabase = await createClient()
  
  try {
    const { data: newContact, error } = await supabase
      .from("contacts")
      .insert([data])
      .select()
      .single()
    
    if (error) {
      console.error("Error creating contact:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/contacts")
    return { success: true, data: newContact }
  } catch (error) {
    console.error("Unexpected error creating contact:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateContact(id: string, data: Partial<Omit<Contacts, "id" | "created_at" | "updated_at">>) {
  const supabase = await createClient()
  
  try {
    const { data: updatedContact, error } = await supabase
      .from("contacts")
      .update(data)
      .eq("id", id)
      .select()
      .single()
    
    if (error) {
      console.error("Error updating contact:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/contacts")
    return { success: true, data: updatedContact }
  } catch (error) {
    console.error("Unexpected error updating contact:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteContacts(contactIds: string[]) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .in("id", contactIds)
    
    if (error) {
      console.error("Error deleting contacts:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/contacts")
    return { success: true, deletedCount: contactIds.length }
  } catch (error) {
    console.error("Unexpected error deleting contacts:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}