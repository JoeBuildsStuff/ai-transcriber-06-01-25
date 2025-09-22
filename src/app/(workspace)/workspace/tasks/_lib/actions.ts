"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { TaskFormData } from "./validations"
import { getContacts as dbGetContacts, getMeetings as dbGetMeetings, getTags as dbGetTags } from "./queries"

interface TaskWithAssociations extends Omit<TaskFormData, "id" | "created_at" | "updated_at"> {
  contactIds?: string[]
  meetingIds?: string[]
  tagIds?: string[]
}

export async function createTask(data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user to set user_id for RLS policy
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract associations from the data
    const { contactIds, meetingIds, tagIds, ...taskData } = data as unknown as TaskWithAssociations
    
    // Include user_id in the task data
    const taskDataWithUserId = {
      ...taskData,
      user_id: user.id
    }

    // Start a transaction by creating the task first
    const { data: newTask, error: taskError } = await supabase
      .from("tasks")
      .insert([taskDataWithUserId])
      .select()
      .single()
    
    if (taskError) {
      console.error("Error creating task:", taskError)
      return { success: false, error: taskError.message }
    }
    
    // Create contact associations if provided
    if (contactIds && contactIds.length > 0) {
      const taskContactsToInsert = contactIds.map(contactId => ({
        task_id: newTask.id,
        contact_id: contactId,
        user_id: user.id
      }))
      
      const { error: taskContactError } = await supabase
        .from("task_contacts")
        .insert(taskContactsToInsert)
      
      if (taskContactError) {
        console.error("Error creating contact associations:", taskContactError)
        // Rollback by deleting the task
        await supabase.from("tasks").delete().eq("id", newTask.id)
        return { success: false, error: taskContactError.message }
      }
    }
    
    // Create meeting associations if provided
    if (meetingIds && meetingIds.length > 0) {
      const taskMeetingsToInsert = meetingIds.map(meetingId => ({
        task_id: newTask.id,
        meeting_id: meetingId,
        user_id: user.id
      }))
      
      const { error: taskMeetingError } = await supabase
        .from("task_meetings")
        .insert(taskMeetingsToInsert)
      
      if (taskMeetingError) {
        console.error("Error creating meeting associations:", taskMeetingError)
        // Rollback by deleting the task and contact associations
        await supabase.from("tasks").delete().eq("id", newTask.id)
        if (contactIds && contactIds.length > 0) {
          await supabase.from("task_contacts").delete().eq("task_id", newTask.id)
        }
        return { success: false, error: taskMeetingError.message }
      }
    }
    
    // Create tag associations if provided
    if (tagIds && tagIds.length > 0) {
      const taskTagsToInsert = tagIds.map(tagId => ({
        task_id: newTask.id,
        tag_id: tagId,
        user_id: user.id
      }))
      
      const { error: taskTagError } = await supabase
        .from("task_tags")
        .insert(taskTagsToInsert)
      
      if (taskTagError) {
        console.error("Error creating tag associations:", taskTagError)
        // Rollback by deleting the task and other associations
        await supabase.from("tasks").delete().eq("id", newTask.id)
        if (contactIds && contactIds.length > 0) {
          await supabase.from("task_contacts").delete().eq("task_id", newTask.id)
        }
        if (meetingIds && meetingIds.length > 0) {
          await supabase.from("task_meetings").delete().eq("task_id", newTask.id)
        }
        return { success: false, error: taskTagError.message }
      }
    }
    
    revalidatePath("/workspace/tasks")
    return { success: true, data: newTask }
  } catch (error) {
    console.error("Unexpected error creating task:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateTask(id: string, data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract associations from the data
    const { contactIds, meetingIds, tagIds, ...taskData } = data as unknown as TaskWithAssociations
    
    // Update the task
    const { data: updatedTask, error: taskError } = await supabase
      .from("tasks")
      .update(taskData)
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user can only update their own tasks
      .select()
      .single()
    
    if (taskError) {
      console.error("Error updating task:", taskError)
      return { success: false, error: taskError.message }
    }
    
    // Update contact associations if provided
    if (contactIds !== undefined) {
      // Delete existing contact associations for this task
      const { error: deleteTaskContactError } = await supabase
        .from("task_contacts")
        .delete()
        .eq("task_id", id)
        .eq("user_id", user.id)
      
      if (deleteTaskContactError) {
        console.error("Error deleting existing contact associations:", deleteTaskContactError)
        return { success: false, error: deleteTaskContactError.message }
      }
      
      // Insert new contact associations
      if (contactIds.length > 0) {
        const taskContactsToInsert = contactIds.map(contactId => ({
          task_id: id,
          contact_id: contactId,
          user_id: user.id
        }))
        
        const { error: taskContactError } = await supabase
          .from("task_contacts")
          .insert(taskContactsToInsert)
        
        if (taskContactError) {
          console.error("Error creating contact associations:", taskContactError)
          return { success: false, error: taskContactError.message }
        }
      }
    }
    
    // Update meeting associations if provided
    if (meetingIds !== undefined) {
      // Delete existing meeting associations for this task
      const { error: deleteTaskMeetingError } = await supabase
        .from("task_meetings")
        .delete()
        .eq("task_id", id)
        .eq("user_id", user.id)
      
      if (deleteTaskMeetingError) {
        console.error("Error deleting existing meeting associations:", deleteTaskMeetingError)
        return { success: false, error: deleteTaskMeetingError.message }
      }
      
      // Insert new meeting associations
      if (meetingIds.length > 0) {
        const taskMeetingsToInsert = meetingIds.map(meetingId => ({
          task_id: id,
          meeting_id: meetingId,
          user_id: user.id
        }))
        
        const { error: taskMeetingError } = await supabase
          .from("task_meetings")
          .insert(taskMeetingsToInsert)
        
        if (taskMeetingError) {
          console.error("Error creating meeting associations:", taskMeetingError)
          return { success: false, error: taskMeetingError.message }
        }
      }
    }
    
    // Update tag associations if provided
    if (tagIds !== undefined) {
      // Delete existing tag associations for this task
      const { error: deleteTaskTagError } = await supabase
        .from("task_tags")
        .delete()
        .eq("task_id", id)
        .eq("user_id", user.id)
      
      if (deleteTaskTagError) {
        console.error("Error deleting existing tag associations:", deleteTaskTagError)
        return { success: false, error: deleteTaskTagError.message }
      }
      
      // Insert new tag associations
      if (tagIds.length > 0) {
        const taskTagsToInsert = tagIds.map(tagId => ({
          task_id: id,
          tag_id: tagId,
          user_id: user.id
        }))
        
        const { error: taskTagError } = await supabase
          .from("task_tags")
          .insert(taskTagsToInsert)
        
        if (taskTagError) {
          console.error("Error creating tag associations:", taskTagError)
          return { success: false, error: taskTagError.message }
        }
      }
    }
    
    revalidatePath("/workspace/tasks")
    return { success: true, data: updatedTask }
  } catch (error) {
    console.error("Unexpected error updating task:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getContacts() {
  return await dbGetContacts()
}

export async function getMeetings() {
  return await dbGetMeetings()
}

export async function getTags() {
  return await dbGetTags()
}

export async function multiUpdateTasks(taskIds: string[], data: Record<string, unknown>) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Extract associations from the data
    const { contactIds, meetingIds, tagIds, ...taskData } = data as unknown as TaskWithAssociations
    
    // Only process fields that are actually provided (not undefined)
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(taskData).filter(([, value]) => value !== undefined)
    )
    
    // Update all tasks with the provided data
    if (Object.keys(fieldsToUpdate).length > 0) {
      const { error: taskError } = await supabase
        .from("tasks")
        .update(fieldsToUpdate)
        .in("id", taskIds)
        .eq("user_id", user.id) // Ensure user can only update their own tasks
      
      if (taskError) {
        console.error("Error multi updating tasks:", taskError)
        return { success: false, error: taskError.message }
      }
    }
    
    // Handle multi contact association updates if provided
    if (contactIds !== undefined) {
      // Delete existing contact associations for all tasks for this user
      const { error: deleteTaskContactError } = await supabase
        .from("task_contacts")
        .delete()
        .in("task_id", taskIds)
        .eq("user_id", user.id)
      
      if (deleteTaskContactError) {
        console.error("Error deleting existing contact associations:", deleteTaskContactError)
        return { success: false, error: deleteTaskContactError.message }
      }
      
      // Insert new contact associations for all tasks
      if (contactIds.length > 0) {
        const taskContactsToInsert = taskIds.flatMap(taskId =>
          contactIds.map(contactId => ({
            task_id: taskId,
            contact_id: contactId,
            user_id: user.id
          }))
        )
        
        const { error: taskContactError } = await supabase
          .from("task_contacts")
          .insert(taskContactsToInsert)
        
        if (taskContactError) {
          console.error("Error creating contact associations:", taskContactError)
          return { success: false, error: taskContactError.message }
        }
      }
    }
    
    // Handle multi meeting association updates if provided
    if (meetingIds !== undefined) {
      // Delete existing meeting associations for all tasks for this user
      const { error: deleteTaskMeetingError } = await supabase
        .from("task_meetings")
        .delete()
        .in("task_id", taskIds)
        .eq("user_id", user.id)
      
      if (deleteTaskMeetingError) {
        console.error("Error deleting existing meeting associations:", deleteTaskMeetingError)
        return { success: false, error: deleteTaskMeetingError.message }
      }
      
      // Insert new meeting associations for all tasks
      if (meetingIds.length > 0) {
        const taskMeetingsToInsert = taskIds.flatMap(taskId =>
          meetingIds.map(meetingId => ({
            task_id: taskId,
            meeting_id: meetingId,
            user_id: user.id
          }))
        )
        
        const { error: taskMeetingError } = await supabase
          .from("task_meetings")
          .insert(taskMeetingsToInsert)
        
        if (taskMeetingError) {
          console.error("Error creating meeting associations:", taskMeetingError)
          return { success: false, error: taskMeetingError.message }
        }
      }
    }
    
    // Handle multi tag association updates if provided
    if (tagIds !== undefined) {
      // Delete existing tag associations for all tasks for this user
      const { error: deleteTaskTagError } = await supabase
        .from("task_tags")
        .delete()
        .in("task_id", taskIds)
        .eq("user_id", user.id)
      
      if (deleteTaskTagError) {
        console.error("Error deleting existing tag associations:", deleteTaskTagError)
        return { success: false, error: deleteTaskTagError.message }
      }
      
      // Insert new tag associations for all tasks
      if (tagIds.length > 0) {
        const taskTagsToInsert = taskIds.flatMap(taskId =>
          tagIds.map(tagId => ({
            task_id: taskId,
            tag_id: tagId,
            user_id: user.id
          }))
        )
        
        const { error: taskTagError } = await supabase
          .from("task_tags")
          .insert(taskTagsToInsert)
        
        if (taskTagError) {
          console.error("Error creating tag associations:", taskTagError)
          return { success: false, error: taskTagError.message }
        }
      }
    }
    
    revalidatePath("/workspace/tasks")
    return { success: true, updatedCount: taskIds.length }
  } catch (error) {
    console.error("Unexpected error multi updating tasks:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function deleteTasks(taskIds: string[]) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      return { success: false, error: "User not authenticated" }
    }

    // Delete related contact associations first (due to foreign key constraints)
    const { error: taskContactError } = await supabase
      .from("task_contacts")
      .delete()
      .in("task_id", taskIds)
      .eq("user_id", user.id)
    
    if (taskContactError) {
      console.error("Error deleting contact associations:", taskContactError)
      return { success: false, error: taskContactError.message }
    }
    
    // Delete related meeting associations
    const { error: taskMeetingError } = await supabase
      .from("task_meetings")
      .delete()
      .in("task_id", taskIds)
      .eq("user_id", user.id)
    
    if (taskMeetingError) {
      console.error("Error deleting meeting associations:", taskMeetingError)
      return { success: false, error: taskMeetingError.message }
    }
    
    // Delete related tag associations
    const { error: taskTagError } = await supabase
      .from("task_tags")
      .delete()
      .in("task_id", taskIds)
      .eq("user_id", user.id)
    
    if (taskTagError) {
      console.error("Error deleting tag associations:", taskTagError)
      return { success: false, error: taskTagError.message }
    }
    
    // Now delete the tasks
    const { error } = await supabase
      .from("tasks")
      .delete()
      .in("id", taskIds)
      .eq("user_id", user.id) // Ensure user can only delete their own tasks
    
    if (error) {
      console.error("Error deleting tasks:", error)
      return { success: false, error: error.message }
    }
    
    revalidatePath("/workspace/tasks")
    return { success: true, deletedCount: taskIds.length }
  } catch (error) {
    console.error("Unexpected error deleting tasks:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
