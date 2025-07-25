"use client"

import { useState } from "react"
import { PencilRuler } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DataTableRowForm } from "./data-table-row-form"
import { ColumnDef } from "@tanstack/react-table"

interface DataTableRowEditProps<TData> {
  columns: ColumnDef<TData>[]
  selectedRows: TData[]
  updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  customForm?: React.ComponentType<{
    data: TData
    onSuccess?: () => void
    onCancel?: () => void
    updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
}

export default function DataTableRowEdit<TData>({ 
  columns, 
  selectedRows,
  updateAction,
  customForm: CustomForm 
}: DataTableRowEditProps<TData>) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    toast.success("Row updated", {
      description: "The row has been successfully updated.",
    })
  }

  const handleCancel = () => {
    setOpen(false)
  }

  // Only show edit button if exactly one row is selected
  if (selectedRows.length !== 1) {
    return null
  }

  const selectedRow = selectedRows[0]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilRuler className="size-4 shrink-0" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Row</SheetTitle>
          <SheetDescription>Edit the selected row.</SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          {CustomForm ? (
            <CustomForm
              data={selectedRow}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              updateAction={updateAction}
            />
          ) : (
            <DataTableRowForm
              columns={columns as ColumnDef<Record<string, unknown>>[]}
              data={selectedRow as Record<string, unknown>}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              updateAction={updateAction as ((id: string, data: Partial<Record<string, unknown>>) => Promise<{ success: boolean; error?: string }>) | undefined}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}