import { createClient } from "@/lib/supabase/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useCallback } from "react"

interface UseSupabaseInputOptions {
  table: string
  field: string
  id: string
  initialValue: string
  onError?: (error: unknown) => void
  onSuccess?: (value: string) => void
  onCreateSuccess?: (id: string) => void
}

// Helper function to check if an ID is temporary
function isTemporaryId(id: string): boolean {
  return id.startsWith('temp-');
}

export function useSupabaseInput({
  table,
  field,
  id,
  initialValue,
  onError,
  onSuccess,
  onCreateSuccess
}: UseSupabaseInputOptions) {
  const [value, setValue] = useState(initialValue)
  const [savedValue, setSavedValue] = useState(initialValue)
  const [realId, setRealId] = useState<string | null>(isTemporaryId(id) ? null : id)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (newValue: string) => {
      const client = createClient()
      
      // If it's a temporary ID, we need to create the record first
      if (isTemporaryId(id) && !realId) {
        // Create the record with the current value
        const { data, error } = await client
          .from(table)
          .insert({ [field]: newValue })
          .select()
          .single()

        if (error) {
          throw error
        }

        // Update the real ID
        setRealId(data.id)
        onCreateSuccess?.(data.id)
        return newValue
      }

      // Use the real ID for updates
      const targetId = realId || id
      
      const { error } = await client
        .from(table)
        .update({ [field]: newValue })
        .eq("id", targetId)

      if (error) {
        throw error
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

  // Handle input change (only updates local state)
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue)
  }, [])

  // Handle blur - update database when user exits the field
  const handleBlur = useCallback(async () => {
    // Only update if the value has actually changed from the saved value
    if (value === savedValue) return

    updateMutation.mutate(value)
  }, [value, savedValue, updateMutation])

  const reset = useCallback(() => {
    setValue(initialValue)
    setSavedValue(initialValue)
  }, [initialValue])

  return {
    value,
    handleChange,
    handleBlur,
    updating: updateMutation.isPending,
    error: updateMutation.error,
    reset,
    savedValue,
    realId
  }
} 