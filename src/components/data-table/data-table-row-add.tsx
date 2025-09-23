"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "@/components/ui/sheet"
import { DataTableRowForm } from "./data-table-row-form"
import { ColumnDef } from "@tanstack/react-table"

interface DataTableRowAddProps<TData> {
  columns: ColumnDef<TData>[]
  createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  customForm?: React.ComponentType<{
    onSuccess?: () => void
    onCancel?: () => void
    createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
}

export default function DataTableRowAdd<TData>({ 
  columns, 
  createAction,
  customForm: CustomForm 
}: DataTableRowAddProps<TData>) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    toast.success("Row added", {
      description: "The new row has been successfully added.",
    })
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4 shrink-0" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col sm:max-w-md gap-0">
        <SheetHeader className="pb-1.5">
          {/* <SheetTitle>Add New Row</SheetTitle> */}
          {/* <SheetDescription>Add a new row to the table.</SheetDescription> */}
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          {CustomForm ? (
            <CustomForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              createAction={createAction}
            />
          ) : (
            <DataTableRowForm
              columns={columns as ColumnDef<Record<string, unknown>>[]}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              createAction={createAction as ((data: Partial<Record<string, unknown>>) => Promise<{ success: boolean; error?: string }>) | undefined}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}