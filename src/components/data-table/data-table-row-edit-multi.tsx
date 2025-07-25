"use client"

import { useState } from "react"
import { PencilRuler } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DataTableRowForm } from "./data-table-row-form"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

interface DataTableRowEditMultiProps<TData> {
  columns: ColumnDef<TData>[]
  selectedRows: TData[]
  selectedRowIds: string[]
  updateActionMulti?: (ids: string[], data: Partial<TData>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  customForm?: React.ComponentType<{
    selectedCount: number
    selectedNoteIds?: string[]
    onSuccess?: () => void
    onCancel?: () => void
    updateActionMulti?: (ids: string[], data: Partial<TData>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  }>
}

export default function DataTableRowEditMulti<TData>({ 
  columns, 
  selectedRows,
  selectedRowIds,
  updateActionMulti,
  customForm: CustomForm 
}: DataTableRowEditMultiProps<TData>) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    toast.success("Rows updated", {
      description: `${selectedRows.length} row(s) have been successfully updated.`,
    })
  }

  const handleCancel = () => {
    setOpen(false)
  }

  // Only show multi edit button if more than one row is selected
  if (selectedRows.length <= 1) {
    return null
  }

  // Create a wrapper function that adapts the multi update action to work with the form
  const adaptedUpdateAction = updateActionMulti ? async (id: string, data: Partial<TData>) => {
    // For multi edit, we ignore the single id and use all selected ids
    return await updateActionMulti(selectedRowIds, data)
  } : undefined

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <PencilRuler className="size-4 shrink-0" />
          <Badge variant="secondary">{selectedRows.length}</Badge>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>multi Edit Rows</SheetTitle>
          <SheetDescription>
            Edit {selectedRows.length} selected row(s). Only fields you modify will be updated.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          {CustomForm ? (
            <CustomForm
              selectedCount={selectedRows.length}
              selectedNoteIds={selectedRowIds}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              updateActionMulti={updateActionMulti ? async (ids: string[], data: Partial<TData>) => {
                // Use the selectedRowIds from this component instead of the empty array passed from the form
                return await updateActionMulti(selectedRowIds, data)
              } : undefined}
            />
          ) : (
            <DataTableRowForm
              columns={columns as ColumnDef<Record<string, unknown>>[]}
              data={{}} // Empty data for multi edit - only show fields to modify
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              updateAction={adaptedUpdateAction as ((id: string, data: Partial<Record<string, unknown>>) => Promise<{ success: boolean; error?: string }>) | undefined}
              isMultiEdit={true}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
} 