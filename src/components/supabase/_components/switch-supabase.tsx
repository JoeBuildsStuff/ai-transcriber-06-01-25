"use client"

import { Switch } from "@/components/ui/switch"
import { useSupabaseField } from "@/components/supabase/_hooks/use-supabase-switch"

interface SwitchSupabaseProps {
  table: string
  field: string
  id: string
  initialValue: boolean
}

export default function SwitchSupabase({ table, field, id, initialValue }: SwitchSupabaseProps) {
  const { value, updateField, updating } = useSupabaseField({
    table,
    field,
    id,
    initialValue
  })

  const handleToggle = (newValue: boolean) => {
    updateField(newValue)
  }

  return (
    <Switch 
      checked={value} 
      onCheckedChange={handleToggle}
      disabled={updating}
    />
  )
}