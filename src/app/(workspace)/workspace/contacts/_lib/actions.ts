"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { Contact } from "./validations"
import { getCompanies as dbGetCompanies } from "./queries"
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

interface ContactWithExtras extends Omit<Contact, "id" | "created_at" | "updated_at"> {
  _emails?: string[]
  _phones?: string[]
  company_name?: string
}

async function findOrCreateCompany(supabase: SupabaseClient<Database>, companyName: string | undefined, userId: string): Promise<string | null> {
    if (!companyName) return null

    // Check if company exists for this user
    const { data: existingCompany, error: findError } = await supabase
        .from("new_companies")
        .select("id")
        .eq("name", companyName)
        .eq("user_id", userId)
        .single()

    if (findError && findError.code !== 'PGRST116') { // PGRST116: no rows found
        console.error("Error finding company:", findError)
        throw new Error(findError.message)
    }

    if (existingCompany) {
        return existingCompany.id
    }

    // Create company if it doesn't exist
    const { data: newCompany, error: createError } = await supabase
        .from("new_companies")
        .insert({ 
            name: companyName,
            user_id: userId
        })
        .select("id")
        .single()

    if (createError) {
        console.error("Error creating company:", createError)
        throw new Error(createError.message)
    }

    return newCompany.id
}

export async function createContact(data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user to set user_id for RLS policy
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract emails, phones and company from the data
    const { _emails, _phones, company_name, ...contactData } = data as ContactWithExtras
    
    // Include user_id in the contact data
    contactData.user_id = user.id
    
    if (company_name) {
      const companyId = await findOrCreateCompany(supabase, company_name, user.id)
      contactData.company_id = companyId
    }

    // Start a transaction by creating the contact first
    const { data: newContact, error: contactError } = await supabase
      .from("new_contacts")
      .insert([contactData])
      .select()
      .single()
    
    if (contactError) {
      console.error("Error creating contact:", contactError)
      return { success: false, error: contactError.message }
    }
    
    // Create emails if provided
    if (_emails && _emails.length > 0) {
      const emailsToInsert = _emails.map((email, index) => ({
        contact_id: newContact.id,
        email: email,
        display_order: index,
        user_id: user.id
      }))
      
      const { error: emailError } = await supabase
        .from("new_contact_emails")
        .insert(emailsToInsert)
      
      if (emailError) {
        console.error("Error creating emails:", emailError)
        // Optionally rollback by deleting the contact
        await supabase.from("new_contacts").delete().eq("id", newContact.id)
        return { success: false, error: emailError.message }
      }
    }
    
    // Create phones if provided
    if (_phones && _phones.length > 0) {
      const phonesToInsert = _phones.map((phone, index) => ({
        contact_id: newContact.id,
        phone: phone,
        display_order: index,
        user_id: user.id
      }))
      
      const { error: phoneError } = await supabase
        .from("new_contact_phones")
        .insert(phonesToInsert)
      
      if (phoneError) {
        console.error("Error creating phones:", phoneError)
        // Optionally rollback
        await supabase.from("new_contacts").delete().eq("id", newContact.id)
        return { success: false, error: phoneError.message }
      }
    }
    
    revalidatePath("/contacts")
    return { success: true, data: newContact }
  } catch (error) {
    console.error("Unexpected error creating contact:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateContact(id: string, data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract emails and phones from the data
    const { _emails, _phones, company_name, ...contactData } = data as ContactWithExtras
    
    if (company_name !== undefined) {
      const companyId = await findOrCreateCompany(supabase, company_name, user.id)
      contactData.company_id = companyId
    }
    
    // Update the contact
    const { data: updatedContact, error: contactError } = await supabase
      .from("new_contacts")
      .update(contactData)
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user can only update their own contacts
      .select()
      .single()
    
    if (contactError) {
      console.error("Error updating contact:", contactError)
      return { success: false, error: contactError.message }
    }
    
    // Update emails if provided
    if (_emails !== undefined) {
      // Delete existing emails for this user
      const { error: deleteEmailError } = await supabase
        .from("new_contact_emails")
        .delete()
        .eq("contact_id", id)
        .eq("user_id", user.id)
      
      if (deleteEmailError) {
        console.error("Error deleting existing emails:", deleteEmailError)
        return { success: false, error: deleteEmailError.message }
      }
      
      // Insert new emails
      if (_emails.length > 0) {
        const emailsToInsert = _emails.map((email, index) => ({
          contact_id: id,
          email: email,
          display_order: index,
          user_id: user.id
        }))
        
        const { error: emailError } = await supabase
          .from("new_contact_emails")
          .insert(emailsToInsert)
        
        if (emailError) {
          console.error("Error creating emails:", emailError)
          return { success: false, error: emailError.message }
        }
      }
    }
    
    // Update phones if provided
    if (_phones !== undefined) {
      // Delete existing phones for this user
      const { error: deletePhoneError } = await supabase
        .from("new_contact_phones")
        .delete()
        .eq("contact_id", id)
        .eq("user_id", user.id)
      
      if (deletePhoneError) {
        console.error("Error deleting existing phones:", deletePhoneError)
        return { success: false, error: deletePhoneError.message }
      }
      
      // Insert new phones
      if (_phones.length > 0) {
        const phonesToInsert = _phones.map((phone, index) => ({
          contact_id: id,
          phone: phone,
          display_order: index,
          user_id: user.id
        }))
        
        const { error: phoneError } = await supabase
          .from("new_contact_phones")
          .insert(phonesToInsert)
        
        if (phoneError) {
          console.error("Error creating phones:", phoneError)
          return { success: false, error: phoneError.message }
        }
      }
    }
    
    revalidatePath("/contacts")
    return { success: true, data: updatedContact }
  } catch (error) {
    console.error("Unexpected error updating contact:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getCompanies() {
  return await dbGetCompanies()
}

export async function deleteContacts(contactIds: string[]) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Delete related emails first (due to foreign key constraints)
    const { error: emailError } = await supabase
      .from("new_contact_emails")
      .delete()
      .in("contact_id", contactIds)
      .eq("user_id", user.id)
    
    if (emailError) {
      console.error("Error deleting emails:", emailError)
      return { success: false, error: emailError.message }
    }
    
    // Delete related phones
    const { error: phoneError } = await supabase
      .from("new_contact_phones")
      .delete()
      .in("contact_id", contactIds)
      .eq("user_id", user.id)
    
    if (phoneError) {
      console.error("Error deleting phones:", phoneError)
      return { success: false, error: phoneError.message }
    }
    
    // Now delete the contacts
    const { error } = await supabase
      .from("new_contacts")
      .delete()
      .in("id", contactIds)
      .eq("user_id", user.id) // Ensure user can only delete their own contacts
    
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