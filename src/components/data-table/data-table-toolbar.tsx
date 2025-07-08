"use client"

import * as React from "react"
import { Table } from "@tanstack/react-table"

import DataTableFilter from "./data-table-filter"
import DataTableSort from "./data-table-sort"
import DataTableRowAdd from "./data-table-row-add"
import DataTableRowEdit from "./data-table-row-edit"
import DataTableRowDelete from "./data-table-row-delete"
import { DataTableViewOptions } from "./data-table-view-options"

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
            
      {/* Sort Controls */}
      <DataTableSort table={table} />
      {/* Column Filters */}
      <DataTableFilter table={table} />


      <div className="ml-auto flex items-center">


        {/* Column visibility toggle */}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}