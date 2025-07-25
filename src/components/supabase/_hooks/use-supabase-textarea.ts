import { createClient } from "@/lib/supabase/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useCallback } from "react"

interface UseSupabaseTextareaOptions {
  table: string
  field: string
  id: string
  initialValue: string
  onError?: (error: unknown) => void
  onSuccess?: (value: string) => void
}

export function useSupabaseTextarea({
  table,
  field,
  id,
  initialValue,
  onError,
  onSuccess
}: UseSupabaseTextareaOptions) {
  const [value, setValue] = useState(initialValue)
  const [savedValue, setSavedValue] = useState(initialValue)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (newValue: string) => {
      const client = createClient()
      const { error } = await client
        .from(table)
        .update({ [field]: newValue })
        .eq("id", id)

      if (error) {
        throw error
      }

      return newValue
    },
    onMutate: async (newValue) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [table, id] })

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
      queryClient.invalidateQueries({ queryKey: [table, id] })
      onSuccess?.(newValue)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [table, id] })
    }
  })

  // Handle textarea change (only updates local state)
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
    savedValue
  }
} 