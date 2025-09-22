"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSupabaseSelect } from "@/components/supabase/_hooks/use-supabase-select"
import { cn } from "@/lib/utils"

export interface SelectSupabaseOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface SelectSupabaseProps {
  table: string
  field: string
  id: string
  initialValue: string
  options: SelectSupabaseOption[]
  placeholder?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  onNoteCreated?: (id: string) => void
  onError?: (error: unknown) => void
  onSuccess?: (value: string) => void
  disabled?: boolean
  onValueChange?: (value: string) => void
  parentDefaults?:
    | Record<string, unknown>
    | ((context: { userId: string }) => Record<string, unknown>)
  transformValue?: (value: string) => string | null
}

export default function SelectSupabase({
  table,
  field,
  id,
  initialValue,
  options,
  placeholder = "Select an option...",
  className,
  triggerClassName,
  contentClassName,
  onNoteCreated,
  onError,
  onSuccess,
  disabled,
  onValueChange,
  parentDefaults,
  transformValue
}: SelectSupabaseProps) {
  const { value, handleChange, updating, savedValue } = useSupabaseSelect({
    table,
    field,
    id,
    initialValue,
    onError,
    onSuccess,
    onCreateSuccess: onNoteCreated,
    parentDefaults,
    transformValue
  })

  const isUnsaved = value !== savedValue

  return (
    <div className={cn("w-full", className)}>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          handleChange(nextValue)
          onValueChange?.(nextValue)
        }}
        disabled={disabled || updating}
      >
        <SelectTrigger
          className={cn(
            "w-full",
            isUnsaved && "text-blue-700 dark:text-blue-400",
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              <span className="flex flex-col text-sm">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-muted-foreground text-xs">
                    {option.description}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
