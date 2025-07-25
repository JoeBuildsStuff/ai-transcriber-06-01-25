import { createClient } from "@/lib/supabase/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

interface UseSupabaseFieldOptions<T> {
  table: string
  field: string
  id: string
  initialValue: T
  onError?: (error: unknown) => void
  onSuccess?: (value: T) => void
}

export function useSupabaseField<T>({
  table,
  field,
  id,
  initialValue,
  onError,
  onSuccess
}: UseSupabaseFieldOptions<T>) {
  const [value, setValue] = useState<T>(initialValue)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (newValue: T) => {
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
      const previousValue = value

      // Optimistically update to the new value
      setValue(newValue)

      // Return a context object with the snapshotted value
      return { previousValue }
    },
    onError: (err, newValue, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousValue !== undefined) {
        setValue(context.previousValue)
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

  const updateField = (newValue: T) => {
    updateMutation.mutate(newValue)
  }

  const reset = () => {
    setValue(initialValue)
  }

  return {
    value,
    setValue,
    updating: updateMutation.isPending,
    error: updateMutation.error,
    updateField,
    reset
  }
} 