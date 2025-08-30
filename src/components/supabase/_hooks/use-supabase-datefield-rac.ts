import { createClient } from "@/lib/supabase/client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, useCallback } from "react"
import { DateValue, TimeValue } from "react-aria-components"
import { CalendarDate } from "@internationalized/date"

interface UseSupabaseDateFieldOptions {
  table: string
  field: string
  id: string
  initialValue: string | null // ISO string from database
  onError?: (error: unknown) => void
  onSuccess?: (value: string) => void
  onCreateSuccess?: (id: string) => void
}

// Helper function to check if an ID is temporary
function isTemporaryId(id: string): boolean {
  return id.startsWith('temp-');
}

// Helper function to convert DateValue to ISO string
function dateValueToISO(dateValue: DateValue | null): string | null {
  if (!dateValue) return null
  try {
    return dateValue.toDate('UTC').toISOString()
  } catch {
    return null
  }
}

// Helper function to convert TimeValue to ISO string
function timeValueToISO(timeValue: TimeValue | null): string | null {
  if (!timeValue) return null
  try {
    // Create a base date and set the time
    const baseDate = new Date()
    baseDate.setHours(timeValue.hour || 0)
    baseDate.setMinutes(timeValue.minute || 0)
    baseDate.setSeconds(timeValue.second || 0)
    baseDate.setMilliseconds(timeValue.millisecond || 0)
    return baseDate.toISOString()
  } catch {
    return null
  }
}

// Helper function to convert ISO string to DateValue
function isoToDateValue(isoString: string | null): DateValue | null {
  if (!isoString) return null
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return null
    // Convert to CalendarDate for date-only values
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return new CalendarDate(year, month, day) as DateValue
  } catch {
    return null
  }
}

// Helper function to convert ISO string to TimeValue
function isoToTimeValue(isoString: string | null): TimeValue | null {
  if (!isoString) return null
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return null
    // Convert to Time for time-only values
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    const millisecond = date.getMilliseconds()
    return { hour, minute, second, millisecond } as TimeValue
  } catch {
    return null
  }
}

export function useSupabaseDateField({
  table,
  field,
  id,
  initialValue,
  onError,
  onSuccess,
  onCreateSuccess
}: UseSupabaseDateFieldOptions) {
  const [value, setValue] = useState<DateValue | null>(isoToDateValue(initialValue))
  const [savedValue, setSavedValue] = useState<DateValue | null>(isoToDateValue(initialValue))
  const [realId, setRealId] = useState<string | null>(isTemporaryId(id) ? null : id)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (newValue: DateValue | null) => {
      const client = createClient()
      const isoValue = dateValueToISO(newValue)
      
      // If it's a temporary ID, we need to create the record first
      if (isTemporaryId(id) && !realId) {
        // Create the record with the current value
        const { data, error } = await client
          .from(table)
          .insert({ [field]: isoValue })
          .select()
          .single()

        if (error) {
          throw error
        }

        // Update the real ID
        setRealId(data.id)
        onCreateSuccess?.(data.id)
        return isoValue
      }

      // Use the real ID for updates
      const targetId = realId || id
      
      const { error } = await client
        .from(table)
        .update({ [field]: isoValue })
        .eq("id", targetId)

      if (error) {
        throw error
      }

      return isoValue
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
    onSuccess: (isoValue) => {
      // Invalidate and refetch the specific record
      const targetId = realId || id
      queryClient.invalidateQueries({ queryKey: [table, targetId] })
      onSuccess?.(isoValue || '')
    },
    onSettled: () => {
      // Always refetch after error or success
      const targetId = realId || id
      queryClient.invalidateQueries({ queryKey: [table, targetId] })
    }
  })

  // Handle date change (only updates local state)
  const handleChange = useCallback((newValue: DateValue | null) => {
    setValue(newValue)
  }, [])

  // Handle blur - update database when user exits the field
  const handleBlur = useCallback(async () => {
    // Only update if the value has actually changed from the saved value
    if (value === savedValue) return

    updateMutation.mutate(value)
  }, [value, savedValue, updateMutation])

  const reset = useCallback(() => {
    const initialDateValue = isoToDateValue(initialValue)
    setValue(initialDateValue)
    setSavedValue(initialDateValue)
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

// Time field hook - similar but for TimeValue
export function useSupabaseTimeField({
  table,
  field,
  id,
  initialValue,
  onError,
  onSuccess,
  onCreateSuccess
}: UseSupabaseDateFieldOptions) {
  const [value, setValue] = useState<TimeValue | null>(isoToTimeValue(initialValue))
  const [savedValue, setSavedValue] = useState<TimeValue | null>(isoToTimeValue(initialValue))
  const [realId, setRealId] = useState<string | null>(isTemporaryId(id) ? null : id)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (newValue: TimeValue | null) => {
      const client = createClient()
      const isoValue = timeValueToISO(newValue)
      
      // If it's a temporary ID, we need to create the record first
      if (isTemporaryId(id) && !realId) {
        // Create the record with the current value
        const { data, error } = await client
          .from(table)
          .insert({ [field]: isoValue })
          .select()
          .single()

        if (error) {
          throw error
        }

        // Update the real ID
        setRealId(data.id)
        onCreateSuccess?.(data.id)
        return isoValue
      }

      // Use the real ID for updates
      const targetId = realId || id
      
      const { error } = await client
        .from(table)
        .update({ [field]: isoValue })
        .eq("id", targetId)

      if (error) {
        throw error
      }

      return isoValue
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
    onSuccess: (isoValue) => {
      // Invalidate and refetch the specific record
      const targetId = realId || id
      queryClient.invalidateQueries({ queryKey: [table, targetId] })
      onSuccess?.(isoValue || '')
    },
    onSettled: () => {
      // Always refetch after error or success
      const targetId = realId || id
      queryClient.invalidateQueries({ queryKey: [table, targetId] })
    }
  })

  // Handle time change (only updates local state)
  const handleChange = useCallback((newValue: TimeValue | null) => {
    setValue(newValue)
  }, [])

  // Handle blur - update database when user exits the field
  const handleBlur = useCallback(async () => {
    // Only update if the value has actually changed from the saved value
    if (value === savedValue) return

    updateMutation.mutate(value)
  }, [value, savedValue, updateMutation])

  const reset = useCallback(() => {
    const initialTimeValue = isoToTimeValue(initialValue)
    setValue(initialTimeValue)
    setSavedValue(initialTimeValue)
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
