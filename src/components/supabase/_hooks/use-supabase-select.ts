import { createClient } from "@/lib/supabase/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"

interface UseSupabaseSelectOptions {
  table: string
  field: string
  id: string
  initialValue: string
  onError?: (error: unknown) => void
  onSuccess?: (value: string) => void
  onCreateSuccess?: (id: string) => void
  parentDefaults?:
    | Record<string, unknown>
    | ((context: { userId: string }) => Record<string, unknown>)
  transformValue?: (value: string) => string | null
}

function isTemporaryId(id: string): boolean {
  return id.startsWith("temp-")
}

export function useSupabaseSelect({
  table,
  field,
  id,
  initialValue,
  onError,
  onSuccess,
  onCreateSuccess,
  parentDefaults,
  transformValue
}: UseSupabaseSelectOptions) {
  const [value, setValue] = useState(initialValue)
  const [savedValue, setSavedValue] = useState(initialValue)
  const [realId, setRealId] = useState<string | null>(isTemporaryId(id) ? null : id)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (newValue: string) => {
      const client = createClient()

      const storedValue = transformValue ? transformValue(newValue) : newValue

      if (isTemporaryId(id) && !realId) {
        const { data: { user }, error: userError } = await client.auth.getUser()

        if (userError || !user) {
          throw userError ?? new Error("User not authenticated")
        }

        const resolvedDefaults = typeof parentDefaults === "function"
          ? parentDefaults({ userId: user.id })
          : parentDefaults

        const insertPayload: Record<string, unknown> = {
          ...(resolvedDefaults ?? {}),
          [field]: storedValue,
        }

        if (!("user_id" in insertPayload)) {
          insertPayload.user_id = user.id
        }

        const { data, error } = await client
          .from(table)
          .insert(insertPayload)
          .select()
          .single()

        if (error) {
          throw error
        }

        setRealId(data.id)
        onCreateSuccess?.(data.id)
        return typeof storedValue === "string" ? storedValue : newValue
      }

      const targetId = realId || id

      const { error } = await client
        .from(table)
        .update({ [field]: storedValue })
        .eq("id", targetId)

      if (error) {
        throw error
      }

      return typeof storedValue === "string" ? storedValue : newValue
    },
    onMutate: async (newValue) => {
      const targetId = realId || id
      await queryClient.cancelQueries({ queryKey: [table, targetId] })

      const previousValue = savedValue

      setValue(newValue)
      setSavedValue(newValue)

      return { previousValue }
    },
    onError: (err, newValue, context) => {
      if (context?.previousValue !== undefined) {
        setValue(context.previousValue)
        setSavedValue(context.previousValue)
      }
      onError?.(err)
    },
    onSuccess: (newValue) => {
      const targetId = realId || id
      queryClient.invalidateQueries({ queryKey: [table, targetId] })
      onSuccess?.(newValue)
    },
    onSettled: () => {
      const targetId = realId || id
      queryClient.invalidateQueries({ queryKey: [table, targetId] })
    }
  })

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue)
    updateMutation.mutate(newValue)
  }, [updateMutation])

  const reset = useCallback(() => {
    setValue(initialValue)
    setSavedValue(initialValue)
  }, [initialValue])

  return {
    value,
    handleChange,
    updating: updateMutation.isPending,
    error: updateMutation.error,
    reset,
    savedValue,
    realId
  }
} 
