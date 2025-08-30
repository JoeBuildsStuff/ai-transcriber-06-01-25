"use client"

import { DateField as DateFieldRac, DateInput as DateInputRac, TimeField as TimeFieldRac } from "@/components/ui/datefield-rac"
import { DateValue, TimeValue } from "react-aria-components"
import { useSupabaseDateField, useSupabaseTimeField } from "@/components/supabase/_hooks/use-supabase-datefield-rac"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

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
}

export function DateFieldSupabase({ 
  table, 
  field, 
  id, 
  initialValue, 
  onNoteCreated, 
  className,
  children,
  ...props 
}: DateFieldSupabaseProps) {
  const { value, handleChange, handleBlur, updating, savedValue } = useSupabaseDateField({
    table,
    field,
    id,
    initialValue,
    onCreateSuccess: onNoteCreated
  })

  // Check if the value has changed from saved (unsaved)
  const isUnsaved = value !== savedValue

  return (
    <DateFieldRac
      value={value}
      onChange={handleChange}
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
  ...props 
}: TimeFieldSupabaseProps) {
  const { value, handleChange, handleBlur, updating, savedValue } = useSupabaseTimeField({
    table,
    field,
    id,
    initialValue,
    onCreateSuccess: onNoteCreated
  })

  // Check if the value has changed from saved (unsaved)
  const isUnsaved = value !== savedValue

  return (
    <TimeFieldRac
      value={value}
      onChange={handleChange}
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
