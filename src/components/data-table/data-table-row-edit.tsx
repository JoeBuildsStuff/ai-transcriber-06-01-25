"use client"

import { useState } from "react"
import { PencilRuler } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DataTableRowForm } from "./data-table-row-form"
import { ColumnDef } from "@tanstack/react-table"

interface DataTableRowEditProps<TData> {
  columns: ColumnDef<TData>[]
  selectedRows: TData[]
  updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
}

export default function DataTableRowEdit<TData>({ columns, selectedRows, updateAction }: DataTableRowEditProps<TData>) {
  const [open, setOpen] = useState(false)

  // Only allow editing if exactly one row is selected
  const canEdit = selectedRows.length === 1
  const editingRow = canEdit ? selectedRows[0] : undefined

  const handleSuccess = () => {
    setOpen(false)
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" disabled={!canEdit}>
          <PencilRuler className="size-4 shrink-0" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Row</SheetTitle>
          <SheetDescription>Edit the selected row in the table.</SheetDescription>
        </SheetHeader>
        
        {canEdit && editingRow && (
          <div className="mt-6">
            <DataTableRowForm
              columns={columns as ColumnDef<Record<string, unknown>>[]}
              data={editingRow}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              updateAction={updateAction as ((id: string, data: Partial<Record<string, unknown>>) => Promise<{ success: boolean; error?: string }>) | undefined}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}