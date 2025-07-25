"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSupabaseComboboxBulk } from "@/components/supabase/_hooks/use-supabase-combobox-bulk"
import { cn } from "@/lib/utils"
import { Check, X, Plus } from "lucide-react"
import { ReactNode } from "react"

export interface ComboboxOption {
  value: string
  label: string
  subLabel?: string
}

interface ComboboxSupabaseBulkProps {
  table: string
  field: string
  noteIds: string[]
  initialValue: string[]
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  // For junction tables
  targetIdField?: string
  // Bulk update action
  bulkUpdateAction: (ids: string[], data: { 
    contactIds?: string[]
    meetingIds?: string[]
    [key: string]: unknown
  }) => Promise<{ success: boolean; error?: string }>
  // Action button props
  actionButton?: {
    label: ReactNode
    onClick: () => void
    icon?: ReactNode
  }
  // Render props for custom display
  renderBadge?: (option: ComboboxOption, onRemove: () => void) => ReactNode
  renderOption?: (option: ComboboxOption, isSelected: boolean) => ReactNode
}

export default function ComboboxSupabaseBulk({
  table,
  field,
  noteIds,
  initialValue,
  options,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyText = "No items found.",
  className,
  targetIdField,
  bulkUpdateAction,
  actionButton,
  renderBadge,
  renderOption
}: ComboboxSupabaseBulkProps) {
  const { value, toggleValue, updating } = useSupabaseComboboxBulk({
    table,
    field,
    noteIds,
    initialValue,
    targetIdField,
    bulkUpdateAction
  })

  // Get display text for selected items
  const getDisplayContent = () => {
    if (value.length === 0) {
      return <span className="text-muted-foreground/80">{placeholder}</span>
    }

    const selectedOptions = options.filter(opt => value.includes(opt.value))
    
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {selectedOptions.map((option) => {
          if (renderBadge) {
            return renderBadge(option, () => toggleValue(option.value))
          }
          
          return (
            <Badge key={option.value} variant="secondary" className="text-sm">
              {option.label}
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-4 ml-1" 
                onClick={(e) => {
                  e.stopPropagation()
                  toggleValue(option.value)
                }}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          )
        })}
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger 
        className={cn(
          "w-full text-left hover:bg-secondary rounded-md py-2 px-2 truncate",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        disabled={updating}
      >
        {getDisplayContent()}
      </PopoverTrigger>
      <PopoverContent className="p-0 rounded-xl" align="start">
        <Command className="w-full rounded-xl">
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-60">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value.includes(option.value)
                
                if (renderOption) {
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => toggleValue(option.value)}
                    >
                      {renderOption(option, isSelected)}
                    </CommandItem>
                  )
                }
                
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggleValue(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                    {option.subLabel && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({option.subLabel})
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {actionButton && (
            <>
              <CommandSeparator />
              <div className="p-1 h-9">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="w-full h-full justify-start rounded-t-none text-muted-foreground"
                  onClick={actionButton.onClick}
                >
                  {actionButton.icon || <Plus className="size-4 shrink-0" strokeWidth={1.5} />}
                  <span className="text-xs">{actionButton.label}</span>
                </Button>
              </div>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
} 