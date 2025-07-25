import { createClient } from "@/lib/supabase/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useCallback, useEffect } from "react"

interface UseSupabaseComboboxOptions {
  table: string
  field: string
  id: string
  initialValue: string[]
  onError?: (error: unknown) => void
  onSuccess?: (value: string[]) => void
  onCreateSuccess?: (id: string) => void
  // For junction tables
  noteIdField?: string // e.g., "note_id"
  targetIdField?: string // e.g., "meeting_id", "contact_id"
}

// Helper function to check if an ID is temporary
function isTemporaryId(id: string): boolean {
  return id.startsWith('temp-');
}

export function useSupabaseCombobox({
  table,
  field,
  id,
  initialValue,
  onError,
  onSuccess,
  onCreateSuccess,
  noteIdField = "note_id",
  targetIdField = field
}: UseSupabaseComboboxOptions) {
  const [value, setValue] = useState<string[]>(initialValue)
  const [savedValue, setSavedValue] = useState<string[]>(initialValue)
  const [realId, setRealId] = useState<string | null>(isTemporaryId(id) ? null : id)
  const queryClient = useQueryClient()

  // Update value when initialValue changes
  useEffect(() => {
    setValue(initialValue)
    setSavedValue(initialValue)
  }, [initialValue])

  const updateMutation = useMutation({
    mutationFn: async (newValue: string[]) => {
      const client = createClient()
      
      // Get current user for RLS
      const { data: { user }, error: userError } = await client.auth.getUser()
      if (userError || !user) {
        throw new Error("User not authenticated")
      }

      // If it's a temporary ID, we need to create the note record first
      if (isTemporaryId(id) && !realId) {
        // Create the note record with minimal data
        const { data, error } = await client
          .from("notes")
          .insert({ 
            title: "", 
            content: "",
            user_id: user.id 
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        // Update the real ID
        setRealId(data.id)
        onCreateSuccess?.(data.id)
        
        // Now handle the junction table records for the new note
        const targetId = data.id
        
        if (newValue.length > 0) {
          const recordsToInsert = newValue.map(val => ({
            [noteIdField]: targetId,
            [targetIdField]: val,
            user_id: user.id
          }))
          
          const { error: junctionError } = await client
            .from(table)
            .insert(recordsToInsert)
          
          if (junctionError) {
            throw junctionError
          }
        }
        
        return newValue
      }

      // Use the real ID for updates
      const targetId = realId || id
      
      // For junction tables, we need to delete existing records and insert new ones
      // First, delete existing records for this note
      const { error: deleteError } = await client
        .from(table)
        .delete()
        .eq(noteIdField, targetId)
        .eq("user_id", user.id)
      
      if (deleteError) {
        throw deleteError
      }
      
      // Insert new records if there are any values
      if (newValue.length > 0) {
        const recordsToInsert = newValue.map(val => ({
          [noteIdField]: targetId,
          [targetIdField]: val,
          user_id: user.id
        }))
        
        const { error: insertError } = await client
          .from(table)
          .insert(recordsToInsert)
        
        if (insertError) {
          throw insertError
        }
      }

      return newValue
    },
    onMutate: async (newValue) => {
      // Cancel any outgoing refetches
      const targetId = realId || id
      await queryClient.cancelQueries({ queryKey: [table, targetId] })

      // Snapshot the previous value
      const previousValue = savedValue

      // Optimistically update to the new value
      setValue(newValue)
      setSavedValue(newValue)

      // Return a context object with the snapshotted value
      return { previousValue }
    },
    onError: (err, newValue, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousValue !== undefined) {
        setValue(context.previousValue)
        setSavedValue(context.previousValue)
      }
      onError?.(err)
    },
    onSuccess: (newValue) => {
      // Invalidate and refetch the specific record
      const targetId = realId || id
      queryClient.invalidateQueries({ queryKey: [table, targetId] })
      onSuccess?.(newValue)
    },
    onSettled: () => {
      // Always refetch after error or success
      const targetId = realId || id
      queryClient.invalidateQueries({ queryKey: [table, targetId] })
    }
  })

  // Handle value change with immediate save
  const handleChange = useCallback((newValue: string[]) => {
    setValue(newValue)
    updateMutation.mutate(newValue)
  }, [updateMutation])

  // Toggle a single value
  const toggleValue = useCallback((itemValue: string) => {
    const newValue = value.includes(itemValue)
      ? value.filter(v => v !== itemValue)
      : [...value, itemValue]
    handleChange(newValue)
  }, [value, handleChange])

  // Clear all values
  const clearAll = useCallback(() => {
    handleChange([])
  }, [handleChange])

  const reset = useCallback(() => {
    setValue(initialValue)
    setSavedValue(initialValue)
  }, [initialValue])

  return {
    value,
    handleChange,
    toggleValue,
    clearAll,
    updating: updateMutation.isPending,
    error: updateMutation.error,
    reset,
    savedValue,
    realId
  }
}
