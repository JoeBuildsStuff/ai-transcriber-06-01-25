"use client"

import { Input } from "@/components/ui/input"
import { useSupabaseInput } from "@/components/supabase/_hooks/use-supabase-input"
import { cn } from "@/lib/utils"

interface InputSupabaseProps {
  table: string
  field: string
  id: string
  initialValue: string
  placeholder?: string
  onNoteCreated?: (id: string) => void
  className?: string
}

export default function InputSupabase({ table, field, id, initialValue, placeholder, onNoteCreated, className }: InputSupabaseProps) {
  const { value, handleChange, handleBlur, updating, savedValue } = useSupabaseInput({
    table,
    field,
    id,
    initialValue,
    onCreateSuccess: onNoteCreated
  })

  // Check if the value has changed from saved (unsaved)
  const isUnsaved = value !== savedValue

  return (
    <Input 
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      disabled={updating}
      placeholder={placeholder || `Enter ${field.replace('_', ' ')}...`}
      className={cn(
        "w-full min-w-0 text-left hover:bg-secondary rounded-md py-2 px-2 truncate shadow-none",
        isUnsaved && "text-blue-700 dark:text-blue-400 font-medium",
        className
      )}
    />
  )
}