import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useCallback, useEffect } from "react"

interface UseSupabaseComboboxBulkOptions {
  table: string
  field: string
  noteIds: string[]
  initialValue: string[]
  onError?: (error: unknown) => void
  onSuccess?: (value: string[]) => void
  // For junction tables
  targetIdField?: string // e.g., "meeting_id", "contact_id"
  // Bulk update action
  bulkUpdateAction: (ids: string[], data: { 
    contactIds?: string[]
    meetingIds?: string[]
    [key: string]: unknown
  }) => Promise<{ success: boolean; error?: string }>
}

export function useSupabaseComboboxBulk({
  table,
  field,
  noteIds,
  initialValue,
  onError,
  onSuccess,
  targetIdField = field,
  bulkUpdateAction
}: UseSupabaseComboboxBulkOptions) {
  const [value, setValue] = useState<string[]>(initialValue)
  const [savedValue, setSavedValue] = useState<string[]>(initialValue)
  const queryClient = useQueryClient()

  // Update value when initialValue changes
  useEffect(() => {
    setValue(initialValue)
    setSavedValue(initialValue)
  }, [initialValue])

  const updateMutation = useMutation({
    mutationFn: async (newValue: string[]) => {
      // Determine the field name for the bulk update action
      const fieldKey = targetIdField === "contact_id" ? "contactIds" : "meetingIds"
      const updateData = { [fieldKey]: newValue }
      
      const result = await bulkUpdateAction(noteIds, updateData)
      
      if (!result.success) {
        throw new Error(result.error || "Bulk update failed")
      }
      
      return newValue
    },
    onMutate: async (newValue) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [table, "bulk", noteIds] })

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
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: [table] })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      onSuccess?.(newValue)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [table] })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
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
    savedValue
  }
} 