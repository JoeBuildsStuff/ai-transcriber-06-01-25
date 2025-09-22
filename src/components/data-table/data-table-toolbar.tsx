"use client"

import * as React from "react"
import { Table } from "@tanstack/react-table"

import DataTableFilter from "./data-table-filter"
import DataTableSort from "./data-table-sort"
import DataTableRowAdd from "./data-table-row-add"
import DataTableRowEditSingle from "./data-table-row-edit-single"
import DataTableRowEditMulti from "./data-table-row-edit-multi"
import DataTableRowDelete from "./data-table-row-delete"
import { DataTableViewOptions } from "./data-table-view-options"
import DataTableSavedViews from "./data-table-saved-views"
import DataTableCommandFilter from "./data-table-command-filter"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  tableKey: string
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
  tableKey,
  deleteAction,
  createAction,
  updateActionSingle,
  updateActionMulti,
  customAddForm,
  customEditFormSingle,
  customEditFormMulti,
}: DataTableToolbarProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original)
  const selectedRowIds = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => {
      const rowData = row.original as Record<string, unknown>
      return String(rowData.id || "")
    })
    .filter(Boolean)

  const handleDeleteComplete = () => {
    table.resetRowSelection()
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full"> 
      <div className="flex flex-row items-center gap-2 w-full">
        {createAction && (
          <DataTableRowAdd
            columns={table.getAllColumns().map((col) => col.columnDef)}
            createAction={createAction}
            customForm={customAddForm}
          />
        )}
        {updateActionSingle && (
          <DataTableRowEditSingle
            columns={table.getAllColumns().map((col) => col.columnDef)}
            selectedRows={selectedRows}
            updateActionSingle={updateActionSingle}
            customForm={customEditFormSingle}
          />
        )}
        {updateActionMulti && (
          <DataTableRowEditMulti
            columns={table.getAllColumns().map((col) => col.columnDef)}
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

        <DataTableSort table={table} />
        <DataTableFilter table={table} />

        <div className="ml-auto flex items-center gap-2">
          <DataTableSavedViews table={table} tableKey={tableKey} />
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <DataTableCommandFilter table={table} />
    </div>
  )
}
