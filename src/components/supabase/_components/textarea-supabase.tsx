"use client"

import { Textarea } from "@/components/ui/textarea"
import { useSupabaseTextarea } from "@/components/supabase/_hooks/use-supabase-textarea"
import { cn } from "@/lib/utils"

interface TextareaSupabaseProps {
  table: string
  field: string
  id: string
  initialValue: string
  placeholder?: string
  rows?: number
  className?: string
}

export default function TextareaSupabase({ 
  table, 
  field, 
  id, 
  initialValue, 
  placeholder, 
  rows = 3,
  className 
}: TextareaSupabaseProps) {
  const { value, handleChange, handleBlur, updating, savedValue } = useSupabaseTextarea({
    table,
    field,
    id,
    initialValue
  })

  // Check if the value has changed from saved (unsaved)
  const isUnsaved = value !== savedValue

  return (
    <Textarea 
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      disabled={updating}
      placeholder={placeholder || `Enter ${field.replace('_', ' ')}...`}
      rows={rows}
      className={cn(
        className,
        isUnsaved && "text-blue-700 dark:text-blue-400 font-medium"
      )}
    />
  )
} 