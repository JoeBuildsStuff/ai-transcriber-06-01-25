"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { Person } from "./validations"
import { getCompanies as dbGetCompanies } from "./queries"
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

interface PersonWithExtras extends Omit<Person, "id" | "created_at" | "updated_at"> {
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

export async function createPerson(data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user to set user_id for RLS policy
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract emails, phones and company from the data
    const { _emails, _phones, company_name, ...contactData } = data as PersonWithExtras
    
    // Include user_id in the contact data
    const contactDataWithUserId = {
      ...contactData,
      user_id: user.id
    }
    
    if (company_name) {
      const companyId = await findOrCreateCompany(supabase, company_name, user.id)
      contactDataWithUserId.company_id = companyId
    }

    // Start a transaction by creating the contact first
    const { data: newContact, error: contactError } = await supabase
      .from("new_contacts")
      .insert([contactDataWithUserId])
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

export async function updatePerson(id: string, data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract emails and phones from the data
    const { _emails, _phones, company_name, ...contactData } = data as PersonWithExtras
    
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

export async function multiUpdatePersons(personIds: string[], data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract emails, phones and company from the data
    const { _emails, _phones, company_name, ...contactData } = data as PersonWithExtras
    
    // Only process fields that are actually provided (not undefined)
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(contactData).filter(([, value]) => value !== undefined)
    )
    
    if (company_name !== undefined) {
      const companyId = await findOrCreateCompany(supabase, company_name, user.id)
      fieldsToUpdate.company_id = companyId
    }
    
    // Update all contacts with the provided data
    if (Object.keys(fieldsToUpdate).length > 0) {
      const { error: contactError } = await supabase
        .from("new_contacts")
        .update(fieldsToUpdate)
        .in("id", personIds)
        .eq("user_id", user.id) // Ensure user can only update their own contacts
      
      if (contactError) {
        console.error("Error multi updating contacts:", contactError)
        return { success: false, error: contactError.message }
      }
    }
    
    // Handle multi email updates if provided
    if (_emails !== undefined) {
      // Delete existing emails for all contacts for this user
      const { error: deleteEmailError } = await supabase
        .from("new_contact_emails")
        .delete()
        .in("contact_id", personIds)
        .eq("user_id", user.id)
      
      if (deleteEmailError) {
        console.error("Error deleting existing emails:", deleteEmailError)
        return { success: false, error: deleteEmailError.message }
      }
      
      // Insert new emails for all contacts
      if (_emails.length > 0) {
        const emailsToInsert = personIds.flatMap(contactId =>
          _emails.map((email, index) => ({
            contact_id: contactId,
            email: email,
            display_order: index,
            user_id: user.id
          }))
        )
        
        const { error: emailError } = await supabase
          .from("new_contact_emails")
          .insert(emailsToInsert)
        
        if (emailError) {
          console.error("Error creating emails:", emailError)
          return { success: false, error: emailError.message }
        }
      }
    }
    
    // Handle multi phone updates if provided
    if (_phones !== undefined) {
      // Delete existing phones for all contacts for this user
      const { error: deletePhoneError } = await supabase
        .from("new_contact_phones")
        .delete()
        .in("contact_id", personIds)
        .eq("user_id", user.id)
      
      if (deletePhoneError) {
        console.error("Error deleting existing phones:", deletePhoneError)
        return { success: false, error: deletePhoneError.message }
      }
      
      // Insert new phones for all contacts
      if (_phones.length > 0) {
        const phonesToInsert = personIds.flatMap(contactId =>
          _phones.map((phone, index) => ({
            contact_id: contactId,
            phone: phone,
            display_order: index,
            user_id: user.id
          }))
        )
        
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
    return { success: true, updatedCount: personIds.length }
  } catch (error) {
    console.error("Unexpected error multi updating contacts:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deletePersons(personIds: string[]) {
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
      .in("contact_id", personIds)
      .eq("user_id", user.id)
    
    if (emailError) {
      console.error("Error deleting emails:", emailError)
      return { success: false, error: emailError.message }
    }
    
    // Delete related phones
    const { error: phoneError } = await supabase
      .from("new_contact_phones")
      .delete()
      .in("contact_id", personIds)
      .eq("user_id", user.id)
    
    if (phoneError) {
      console.error("Error deleting phones:", phoneError)
      return { success: false, error: phoneError.message }
    }
    
    // Now delete the contacts
    const { error } = await supabase
      .from("new_contacts")
      .delete()
      .in("id", personIds)
      .eq("user_id", user.id) // Ensure user can only delete their own contacts
    
    if (error) {
      console.error("Error deleting contacts:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/contacts")
    return { success: true, deletedCount: personIds.length }
  } catch (error) {
    console.error("Unexpected error deleting contacts:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateContactNotes(contactId: string, notes: string) {
  const supabase = await createClient()

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return { error: "User not authenticated" }
    }

    const { error } = await supabase
      .from("new_contacts")
      .update({ notes })
      .eq("id", contactId)
      .eq("user_id", userData.user.id)

    if (error) {
      console.error("Error updating contact notes:", error)
      return { error: "Failed to update contact notes." }
    }

    revalidatePath(`/workspace/contacts/${contactId}`)
    return {}
  } catch (e) {
    const error = e as Error
    console.error("Unexpected error updating contact notes:", error)
    return { error: `An unexpected error occurred: ${error.message}` }
  }
}

// TODO: createcontact vs creatperson? 
export async function createContact(formData: FormData) {
  // Extract data from FormData and convert to the format expected by createPerson
  const data: Record<string, unknown> = {}
  
  for (const [key, value] of formData.entries()) {
    if (value && typeof value === 'string' && value.trim() !== '') {
      data[key] = value.trim()
    }
  }

  // Call the existing createPerson function
  const result = await createPerson(data)
  
  if (result.success && result.data) {
    return {
      contact: {
        id: result.data.id,
        first_name: result.data.first_name,
        last_name: result.data.last_name,
        // Add other fields as needed
      }
    }
  } else {
    return {
      error: result.error || "Failed to create contact"
    }
  }
}

export async function toggleContactFavorite(contactId: string, currentIsFavorite: boolean) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return {
      error: "You must be logged in to update a contact.",
      errorType: "auth"
    }
  }

  if (!contactId) {
      return {
          error: "Contact ID is missing.",
          errorType: "validation"
      }
  }

  const { error } = await supabase
    .from("new_contacts")
    .update({ is_favorite: !currentIsFavorite })
    .eq("id", contactId)
    .eq("user_id", userData.user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating favorite status:', error)
    if (error.code === 'PGRST116') {
        return {
            error: "Contact not found or you don't have permission to modify it.",
            errorType: 'permission'
        }
    }
    return {
      error: "Failed to update favorite status. Please try again.",
      errorType: "database"
    }
  }

  revalidatePath("/workspace/contacts")
  revalidatePath(`/workspace/contacts/${contactId}`)

  return {
    data: "Favorite status updated",
  }
}
