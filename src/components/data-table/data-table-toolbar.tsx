"use client"

import * as React from "react"
import { Table } from "@tanstack/react-table"
import { Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import DataTableFilter from "./data-table-filter"
import DataTableSort from "./data-table-sort"
import DataTableRowAdd from "./data-table-row-add"
import DataTableRowEdit from "./data-table-row-edit"
import DataTableRowDelete from "./data-table-row-delete"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  deleteAction?: (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  customAddForm?: React.ComponentType<{
    onSuccess?: () => void
    onCancel?: () => void
    createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
  customEditForm?: React.ComponentType<{
    data: TData
    onSuccess?: () => void
    onCancel?: () => void
    updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
}

export default function DataTableToolbar<TData>({
  table,
  deleteAction,
  createAction,
  updateAction,
  customAddForm,
  customEditForm,
}: DataTableToolbarProps<TData>) {
  // Get selected rows data
  const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
  const selectedRowIds = table.getFilteredSelectedRowModel().rows.map(row => {
    const rowData = row.original as Record<string, unknown>
    return String(rowData.id || '')
  }).filter(Boolean)

  const handleDeleteComplete = () => {
    table.resetRowSelection()
  }

  return (
    <div className="flex items-center gap-2">

            
      {/* Sort Controls */}
      <DataTableSort table={table} />
      {/* Column Filters */}
      <DataTableFilter table={table} />


      <div className="ml-auto flex items-center gap-2">
        {/* Action Buttons */}
        {createAction && (
          <DataTableRowAdd 
            columns={table.getAllColumns().map(col => col.columnDef)} 
            createAction={createAction}
            customForm={customAddForm}
          />
        )}
        {updateAction && (
          <DataTableRowEdit 
            columns={table.getAllColumns().map(col => col.columnDef)} 
            selectedRows={selectedRows} 
            updateAction={updateAction}
            customForm={customEditForm}
          />
        )}
        {deleteAction && selectedRowIds.length > 0 && (
          <DataTableRowDelete 
            selectedRowIds={selectedRowIds} 
            deleteAction={deleteAction}
            onComplete={handleDeleteComplete}
          />
        )}

        {/* Column visibility toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" && column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}