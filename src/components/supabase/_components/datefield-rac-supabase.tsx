"use client"

import { DateField as DateFieldRac, DateInput as DateInputRac, TimeField as TimeFieldRac } from "@/components/ui/datefield-rac"
import { DateValue, TimeValue } from "react-aria-components"
import { useSupabaseDateField, useSupabaseTimeField } from "@/components/supabase/_hooks/use-supabase-datefield-rac"
import { cn } from "@/lib/utils"
import { ReactNode, useCallback } from "react"

interface DateFieldSupabaseProps {
  table: string
  field: string
  id: string
  initialValue: string | null
  onNoteCreated?: (id: string) => void
  className?: string
  children?: ReactNode
  value?: DateValue
  onChange?: (value: DateValue | null) => void
  onBlur?: () => void
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  autoFocus?: boolean
  validationState?: "valid" | "invalid"
  errorMessage?: string
  description?: string
  onSuccess?: (value: string | null) => void
  onError?: (error: unknown) => void
  parentDefaults?:
    | Record<string, unknown>
    | ((context: { userId: string }) => Record<string, unknown>)
}

interface TimeFieldSupabaseProps {
  table: string
  field: string
  id: string
  initialValue: string | null
  onNoteCreated?: (id: string) => void
  className?: string
  children?: ReactNode
  value?: TimeValue
  onChange?: (value: TimeValue | null) => void
  onBlur?: () => void
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  autoFocus?: boolean
  validationState?: "valid" | "invalid"
  errorMessage?: string
  description?: string
  onSuccess?: (value: string | null) => void
  onError?: (error: unknown) => void
  parentDefaults?:
    | Record<string, unknown>
    | ((context: { userId: string }) => Record<string, unknown>)
}

export function DateFieldSupabase({ 
  table, 
  field, 
  id, 
  initialValue, 
  onNoteCreated, 
  className,
  children,
  onChange,
  onSuccess,
  onError,
  parentDefaults,
  ...props 
}: DateFieldSupabaseProps) {
  const { value, handleChange, handleBlur, updating, savedValue } = useSupabaseDateField({
    table,
    field,
    id,
    initialValue,
    onCreateSuccess: onNoteCreated,
    onSuccess: (isoValue) => {
      onSuccess?.(isoValue ? isoValue : null)
    },
    onError,
    parentDefaults
  })

  // Check if the value has changed from saved (unsaved)
  const isUnsaved = value !== savedValue

  const handleDateChange = useCallback((nextValue: DateValue | null) => {
    handleChange(nextValue)
    onChange?.(nextValue)
  }, [handleChange, onChange])

  return (
    <DateFieldRac
      value={value}
      onChange={handleDateChange}
      onBlur={handleBlur}
      isDisabled={updating || props.isDisabled}
      className={cn(
        isUnsaved && "text-blue-700 dark:text-blue-400 font-medium",
        className
      )}
      {...props}
    >
      {children}
    </DateFieldRac>
  )
}

export function TimeFieldSupabase({ 
  table, 
  field, 
  id, 
  initialValue, 
  onNoteCreated, 
  className,
  children,
  onChange,
  onSuccess,
  onError,
  parentDefaults,
  ...props 
}: TimeFieldSupabaseProps) {
  const { value, handleChange, handleBlur, updating, savedValue } = useSupabaseTimeField({
    table,
    field,
    id,
    initialValue,
    onCreateSuccess: onNoteCreated,
    onSuccess: (isoValue) => {
      onSuccess?.(isoValue ? isoValue : null)
    },
    onError,
    parentDefaults
  })

  // Check if the value has changed from saved (unsaved)
  const isUnsaved = value !== savedValue

  const handleTimeChange = useCallback((nextValue: TimeValue | null) => {
    handleChange(nextValue)
    onChange?.(nextValue)
  }, [handleChange, onChange])

  return (
    <TimeFieldRac
      value={value}
      onChange={handleTimeChange}
      onBlur={handleBlur}
      isDisabled={updating || props.isDisabled}
      className={cn( 
        isUnsaved && "text-blue-700 dark:text-blue-400 font-medium",
        className
      )}
      {...props}
    >
      {children}
    </TimeFieldRac>
  )
}

// Re-export the DateInput component for convenience
export { DateInputRac as DateInputSupabase }
