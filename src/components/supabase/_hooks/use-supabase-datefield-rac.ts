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
  parentDefaults?:
    | Record<string, unknown>
    | ((context: { userId: string }) => Record<string, unknown>)
}

// Helper function to check if an ID is temporary
function isTemporaryId(id: string): boolean {
  return id.startsWith('temp-');
}

// Helper function to convert DateValue to ISO string
function dateValueToISO(dateValue: DateValue | null, existingTimeISO?: string | null): string | null {
  if (!dateValue) return null
  try {
    // If we have an existing time, preserve it by updating only the date part
    if (existingTimeISO) {
      const existingDate = new Date(existingTimeISO)
      // Create a new date with the selected date but preserve the time
      const newDate = new Date(dateValue.year, dateValue.month - 1, dateValue.day, 
                               existingDate.getHours(), existingDate.getMinutes(), 
                               existingDate.getSeconds(), existingDate.getMilliseconds())
      return newDate.toISOString()
    }
    
    // No existing time, create date at noon in user's timezone to avoid timezone shift issues
    const localDate = new Date(dateValue.year, dateValue.month - 1, dateValue.day, 12, 0, 0, 0)
    return localDate.toISOString()
  } catch {
    return null
  }
}

// Helper function to convert TimeValue to ISO string
function timeValueToISO(timeValue: TimeValue | null, existingDateISO?: string | null): string | null {
  if (!timeValue) return null
  try {
    let baseDate: Date
    
    // If we have an existing date, preserve the date part
    if (existingDateISO) {
      const existingDate = new Date(existingDateISO)
      // Create new date with existing date but new time
      baseDate = new Date(existingDate.getFullYear(), existingDate.getMonth(), existingDate.getDate(),
                          timeValue.hour || 0, timeValue.minute || 0, 
                          timeValue.second || 0, timeValue.millisecond || 0)
    } else {
      // No existing date, use today's date in local timezone
      const today = new Date()
      baseDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                          timeValue.hour || 0, timeValue.minute || 0, 
                          timeValue.second || 0, timeValue.millisecond || 0)
    }
    
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
    // Convert to CalendarDate for date-only values using local timezone
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
    // Convert to Time for time-only values using local timezone
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
  onCreateSuccess,
  parentDefaults
}: UseSupabaseDateFieldOptions) {
  const [value, setValue] = useState<DateValue | null>(isoToDateValue(initialValue))
  const [savedValue, setSavedValue] = useState<DateValue | null>(isoToDateValue(initialValue))
  const [realId, setRealId] = useState<string | null>(isTemporaryId(id) ? null : id)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (newValue: DateValue | null) => {
      const client = createClient()
      
      // Fetch current value from database to preserve time when updating date
      let currentValue = initialValue
      const targetId = realId || id
      
      if (!isTemporaryId(id)) {
        const { data } = await client
          .from(table)
          .select(field)
          .eq("id", targetId)
          .single()
        
        currentValue = data?.[field as keyof typeof data] as string || initialValue
      }
      
      const isoValue = dateValueToISO(newValue, currentValue)
      
      // If it's a temporary ID, we need to create the record first
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
          [field]: isoValue,
        }

        if (!("user_id" in insertPayload)) {
          insertPayload.user_id = user.id
        }

        if (!("title" in insertPayload) && table === "tasks") {
          insertPayload.title = ""
        }

        const { data, error } = await client
          .from(table)
          .insert(insertPayload)
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
  onCreateSuccess,
  parentDefaults
}: UseSupabaseDateFieldOptions) {
  const [value, setValue] = useState<TimeValue | null>(isoToTimeValue(initialValue))
  const [savedValue, setSavedValue] = useState<TimeValue | null>(isoToTimeValue(initialValue))
  const [realId, setRealId] = useState<string | null>(isTemporaryId(id) ? null : id)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async (newValue: TimeValue | null) => {
      const client = createClient()
      
      // Fetch current value from database to preserve date when updating time
      let currentValue = initialValue
      const targetId = realId || id
      
      if (!isTemporaryId(id)) {
        const { data } = await client
          .from(table)
          .select(field)
          .eq("id", targetId)
          .single()
        
        currentValue = data?.[field as keyof typeof data] as string || initialValue
      }
      
      const isoValue = timeValueToISO(newValue, currentValue)
      
      // If it's a temporary ID, we need to create the record first
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
          [field]: isoValue,
        }

        if (!("user_id" in insertPayload)) {
          insertPayload.user_id = user.id
        }

        if (!("title" in insertPayload) && table === "tasks") {
          insertPayload.title = ""
        }

        const { data, error } = await client
          .from(table)
          .insert(insertPayload)
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
