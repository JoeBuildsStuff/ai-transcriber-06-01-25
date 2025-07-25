import { createClient } from "@/lib/supabase/client"
import { useState, useCallback } from "react"

interface UseSupabaseSelectOptions {
  table: string
  field: string
  id: string
  initialValue: string
  onError?: (error: unknown) => void
  onSuccess?: (value: string) => void
}

export function useSupabaseSelect({
  table,
  field,
  id,
  initialValue,
  onError,
  onSuccess
}: UseSupabaseSelectOptions) {
  const [value, setValue] = useState(initialValue)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback(async (newValue: string) => {
    // Optimistically update the UI immediately
    setValue(newValue)
    setUpdating(true)
    setError(null)
    
    try {
      const client = createClient()
      const { error: updateError } = await client
        .from(table)
        .update({ [field]: newValue })
        .eq("id", id)

      if (updateError) {
        console.error("Update error:", updateError)
        setError(updateError.message)
        // Revert on failure
        setValue(initialValue)
        onError?.(updateError)
        return
      }

      // Success - keep the optimistic update
      onSuccess?.(newValue)
    } catch (err) {
      console.error("Select update error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
      // Revert on failure
      setValue(initialValue)
      onError?.(err)
    } finally {
      setUpdating(false)
    }
  }, [table, field, id, initialValue, onError, onSuccess])

  const reset = useCallback(() => {
    setValue(initialValue)
    setError(null)
  }, [initialValue])

  return {
    value,
    handleChange,
    updating,
    error,
    reset
  }
} 