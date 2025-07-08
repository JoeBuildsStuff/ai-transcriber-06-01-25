"use client"

import * as React from "react"
import { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"

import DataTableFilter from "./data-table-filter"
import DataTableSort from "./data-table-sort"
import DataTableRowAdd from "./data-table-row-add"
import DataTableRowEditSingle from "./data-table-row-edit-single"
import DataTableRowEditMulti from "./data-table-row-edit-multi"
import DataTableRowDelete from "./data-table-row-delete"
import { DataTableViewOptions } from "./data-table-view-options"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  deleteAction?: (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  updateActionSingle?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  updateActionMulti?: (ids: string[], data: Partial<TData>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  customAddForm?: React.ComponentType<{
    onSuccess?: () => void
    onCancel?: () => void
    createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
  customEditFormSingle?: React.ComponentType<{
    data: TData
    onSuccess?: () => void
    onCancel?: () => void
    updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
  customEditFormMulti?: React.ComponentType<{
    selectedCount: number
    onSuccess?: () => void
    onCancel?: () => void
    updateActionMulti?: (ids: string[], data: Partial<TData>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  }>
}

export default function DataTableToolbar<TData>({
  table,
  deleteAction,
  createAction,
  updateActionSingle,
  updateActionMulti,
  customAddForm,
  customEditFormSingle,
  customEditFormMulti,
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

  const isFiltered = table.getState().columnFilters.length > 0
  const isSorted = table.getState().sorting.length > 0

  return (
    <div className="flex items-center gap-2">

      {/* Action Buttons */}
      {createAction && (
        <DataTableRowAdd 
          columns={table.getAllColumns().map(col => col.columnDef)} 
          createAction={createAction}
          customForm={customAddForm}
        />
      )}
      {updateActionSingle && (
        <DataTableRowEditSingle 
          columns={table.getAllColumns().map(col => col.columnDef)} 
          selectedRows={selectedRows} 
          updateActionSingle={updateActionSingle}
          customForm={customEditFormSingle}
        />
      )}
      {updateActionMulti && (
        <DataTableRowEditMulti 
          columns={table.getAllColumns().map(col => col.columnDef)} 
          selectedRows={selectedRows} 
          selectedRowIds={selectedRowIds}
          updateActionMulti={updateActionMulti}
          customForm={customEditFormMulti}
        />
      )}
      {deleteAction && selectedRowIds.length > 0 && (
        <DataTableRowDelete 
          selectedRowIds={selectedRowIds} 
          deleteAction={deleteAction}
          onComplete={handleDeleteComplete}
        />
      )}    

      {/* Sort Controls */}
      <DataTableSort table={table} />

      {/* Column Filters */}
      <DataTableFilter table={table} />

      {/* Clear filters and Sort */}
      {(isFiltered || isSorted) && (
        <Button
          variant="secondary"
          onClick={() => {
            table.resetColumnFilters(true)
            table.resetSorting(true)
          }}
        >
          Reset
          <X className="h-4 w-4" />
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Column visibility toggle */}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}