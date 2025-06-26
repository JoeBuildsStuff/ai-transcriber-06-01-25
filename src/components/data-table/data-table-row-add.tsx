"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DataTableRowForm } from "./data-table-row-form"
import { ColumnDef } from "@tanstack/react-table"

interface DataTableRowAddProps<TData> {
  columns: ColumnDef<TData>[]
  createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
}

export default function DataTableRowAdd<TData>({ columns, createAction }: DataTableRowAddProps<TData>) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Plus className="size-4 shrink-0" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Row</SheetTitle>
          <SheetDescription>Add a new row to the table.</SheetDescription>
        </SheetHeader>
        
        <div className="mt-6">
          <DataTableRowForm
            columns={columns as ColumnDef<Record<string, unknown>>[]}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            createAction={createAction as ((data: Partial<Record<string, unknown>>) => Promise<{ success: boolean; error?: string }>) | undefined}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}