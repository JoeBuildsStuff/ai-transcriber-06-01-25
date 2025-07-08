"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon, X, Plus, Save } from "lucide-react"

interface DataTableRowFormProps<TData> {
  columns: ColumnDef<TData>[]
  data?: TData
  onSuccess?: () => void
  onCancel?: () => void
  createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  isMultiEdit?: boolean
}

type FormData = Record<string, string | boolean | string[] | null | undefined>

type ColumnMeta = {
  label: string
  variant?: "text" | "select" | "multiSelect" | "boolean" | "date" | "number" | "range" | "dateRange"
  placeholder?: string
  options?: { label: string; value: string }[]
  rows?: number
  excludeFromForm?: boolean
  readOnly?: boolean
}

type FormColumn<TData> = ColumnDef<TData> & {
  accessorKey?: string
  meta?: ColumnMeta
}

export function DataTableRowForm<TData extends Record<string, unknown>>({ 
  columns, 
  data, 
  onSuccess, 
  onCancel,
  createAction,
  updateAction,
  isMultiEdit = false
}: DataTableRowFormProps<TData>) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!data
  
  // Use only the passed columns for form generation
  const formColumns = columns as FormColumn<TData>[]
  
  const [formData, setFormData] = useState<FormData>(() => {
    const initialData: FormData = {}
    
    // Initialize form data based on columns, excluding those marked to exclude from form
    formColumns.forEach(column => {
      if ('accessorKey' in column && column.accessorKey && !column.meta?.excludeFromForm) {
        const key = column.accessorKey as string
        // For multi edit, start with empty values so only modified fields are updated
        initialData[key] = isMultiEdit ? "" : (data?.[key as keyof TData] as string | boolean | string[] | null | undefined) ?? ""
      }
    })
    
    return initialData
  })

  const handleInputChange = (field: string, value: string | boolean | string[] | null | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const renderFormField = (column: FormColumn<TData>) => {
    if (!('accessorKey' in column) || !column.accessorKey) return null
    
    const fieldName = column.accessorKey as string
    
    // Check if this field should be excluded from the form
    if (column.meta?.excludeFromForm) return null
    
    // Hide readonly fields in add form
    if (!isEditing && column.meta?.readOnly) return null
    
    const value = formData[fieldName]
    const meta = column.meta
    if (!meta) return null
    
    const { label, variant, placeholder, options, rows, readOnly } = meta
    
    switch (variant) {
      case "multiSelect":
        const selectedValues = Array.isArray(value) ? value : []
        
        return (
          <div key={fieldName} className="space-y-2">
            <Label className={cn(readOnly && "text-muted-foreground")}>{label}</Label>
            <div className="flex flex-wrap gap-2">
              {options?.map((option: { label: string; value: string }) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={readOnly}
                  className="h-auto p-0 hover:bg-transparent"
                  onClick={readOnly ? undefined : () => {
                    const newValues = selectedValues.includes(option.value)
                      ? selectedValues.filter((v: string) => v !== option.value)
                      : [...selectedValues, option.value]
                    handleInputChange(fieldName, newValues)
                  }}
                >
                  <Badge
                    variant={selectedValues.includes(option.value) ? "default" : "outline"}
                    className={readOnly ? "cursor-default" : "cursor-pointer"}
                  >
                    {option.label}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        )
        
      case "select":
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldName} className={cn(readOnly && "text-muted-foreground")}>{label}</Label>
            <Select 
              value={value as string || ""} 
              onValueChange={(newValue) => handleInputChange(fieldName, newValue)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder={placeholder || `Select ${label?.toLowerCase()}...`} />
              </SelectTrigger>
              <SelectContent>
                {options?.map((option: { label: string; value: string }) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
        
      case "boolean":
        return (
          <div key={fieldName} className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor={fieldName} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", readOnly && "text-muted-foreground")}>
              {label}
            </Label>
            <Switch
              id={fieldName}
              checked={!!value}
              onCheckedChange={(checked) => handleInputChange(fieldName, checked)}
              disabled={readOnly}
            />
          </div>
        )
        
      case "date":
        const dateValue = value ? new Date(value as string) : undefined
        
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldName} className={cn(readOnly && "text-muted-foreground")}>{label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={readOnly}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !value && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(dateValue!, "PPP") : <span>{placeholder || "Pick a date"}</span>}
                </Button>
              </PopoverTrigger>
              {!readOnly && (
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={(date) => handleInputChange(fieldName, date ? format(date, "yyyy-MM-dd") : "")}
                  />
                </PopoverContent>
              )}
            </Popover>
          </div>
        )
        
      case "text":
      default:
        // Special handling for notes field as textarea
        if (fieldName === "notes") {
          return (
            <div key={fieldName} className="space-y-2">
              <Label htmlFor={fieldName} className={cn(readOnly && "text-muted-foreground")}>{label}</Label>
              <Textarea
                id={fieldName}
                value={value as string || ""}
                onChange={(e) => handleInputChange(fieldName, e.target.value)}
                placeholder={placeholder}
                rows={rows || 3}
                disabled={readOnly}
              />
            </div>
          )
        }
        
        // Determine input type based on field name patterns
        let inputType = "text"
        if (fieldName.includes("email")) inputType = "email"
        else if (fieldName.includes("phone") || fieldName.includes("tel")) inputType = "tel"
        else if (fieldName.includes("url") || fieldName.includes("website")) inputType = "url"
        else if (fieldName.includes("number") || fieldName.includes("amount") || fieldName.includes("quantity")) inputType = "number"
        
        return (
          <div key={fieldName} className="space-y-2">
            <Label htmlFor={fieldName} className={cn(readOnly && "text-muted-foreground")}>{label}</Label>
            <Input
              id={fieldName}
              type={inputType}
              value={value as string || ""}
              onChange={(e) => handleInputChange(fieldName, e.target.value)}
              placeholder={placeholder}
              disabled={readOnly}
            />
          </div>
        )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Clean up the data and filter out read-only fields
      const cleanedData: Record<string, string | boolean | string[] | null | undefined> = {}
      
      Object.entries(formData).forEach(([key, value]) => {
        // Check if this field is read-only
        const column = formColumns.find(col => 'accessorKey' in col && col.accessorKey === key)
        if (column?.meta?.readOnly) return // Skip read-only fields
        
        // For multi edit, only include fields that have been modified (not empty)
        if (isMultiEdit) {
          if (typeof value === 'string' && value.trim() === '') return
          if (Array.isArray(value) && value.length === 0) return
          if (value === null || value === undefined) return
        }
        
        if (typeof value === 'string') {
          cleanedData[key] = value.trim() || undefined
        } else if (Array.isArray(value)) {
          cleanedData[key] = value.length > 0 ? value : null
        } else {
          cleanedData[key] = value
        }
      })

      let result
      if (isMultiEdit && updateAction) {
        // For multi edit, use updateAction with empty id (the action will handle multiple IDs)
        const updateData = Object.fromEntries(
          Object.entries(cleanedData).filter(([, v]) => v !== undefined)
        )
        result = await updateAction('', updateData as Partial<TData>)
      } else if (isEditing && updateAction && data && 'id' in data) {
        const updateData = Object.fromEntries(
          Object.entries(cleanedData).filter(([, v]) => v !== undefined)
        )
        result = await updateAction(data.id as string, updateData as Partial<TData>)
      } else if (!isEditing && createAction) {
        result = await createAction(cleanedData as Partial<TData>)
      } else {
        console.error("Missing action or data for form submission")
        return
      }
      
      if (result.success) {
        router.refresh()
        onSuccess?.()
      } else {
        console.error(`Failed to ${isEditing ? 'update' : 'create'} record:`, result.error)
      }
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Group columns by common patterns for better layout
  const groupFields = (cols: FormColumn<TData>[]) => {
    const groups: Record<string, FormColumn<TData>[]> = {
      name: [],
      contact: [],
      work: [],
      other: [],
      readonly: []
    }
    
    cols.forEach(col => {
      if (!('accessorKey' in col) || !col.accessorKey || col.meta?.excludeFromForm) return
      
      // Skip readonly fields in add form
      if (!isEditing && col.meta?.readOnly) return
      
      const key = col.accessorKey as string
      
      // Group readonly fields separately
      if (col.meta?.readOnly) {
        groups.readonly.push(col)
      } else if (key.includes('name')) {
        groups.name.push(col)
      } else if (key.includes('email') || key.includes('phone')) {
        groups.contact.push(col)
      } else if (key.includes('company') || key.includes('job') || key.includes('title')) {
        groups.work.push(col)
      } else {
        groups.other.push(col)
      }
    })
    
    return groups
  }
  
  const fieldGroups = groupFields(formColumns)

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Name fields */}
        {fieldGroups.name.length > 0 && (
          <div className={fieldGroups.name.length > 1 ? "grid grid-cols-2 gap-4" : ""}>
            {fieldGroups.name.map(renderFormField)}
          </div>
        )}
        
        {/* Contact fields */}
        {fieldGroups.contact.length > 0 && (
          <div className={fieldGroups.contact.length > 1 ? "grid grid-cols-2 gap-4" : ""}>
            {fieldGroups.contact.map(renderFormField)}
          </div>
        )}
        
        {/* Work fields */}
        {fieldGroups.work.length > 0 && (
          <div className={fieldGroups.work.length > 1 ? "grid grid-cols-2 gap-4" : ""}>
            {fieldGroups.work.map(renderFormField)}
          </div>
        )}
        
        {/* Other fields */}
        {fieldGroups.other.map(renderFormField)}
        
        {/* Readonly fields - only show in edit mode */}
        {isEditing && fieldGroups.readonly.length > 0 && (
          <>
            <div className="py-2">
              <Separator />
            </div>
            <div className="space-y-4">
              {fieldGroups.readonly.map(renderFormField)}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between gap-2 p-4 border-t bg-background">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-1/2"
        >
          <X className="size-4 shrink-0" /> Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-1/2"
        >
          {isMultiEdit ? (
            <>
              <Save className="size-4 shrink-0" />
              {isSubmitting ? "Updating..." : "Update All"}
            </>
          ) : isEditing ? (
            <>
              <Save className="size-4 shrink-0" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </>
          ) : (
            <>
              <Plus className="size-4 shrink-0" />
              {isSubmitting ? "Adding..." : "Add Record"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}