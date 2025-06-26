import { DataTableViewOptions } from "./data-table-view-options"
import { Table } from "@tanstack/react-table"
import DataTableFilter from "./data-table-filter"
import DataTableSort from "./data-table-sort"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import DataTableRowDelete from "./data-table-row-delete"
import DataTableRowAdd from "./data-table-row-add"
import DataTableRowEdit from "./data-table-row-edit"

interface DataTableToolbarProps<TData> {
    table: Table<TData>
    deleteAction?: (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
    createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
    updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }

export default function DataTableToolbar<TData>({ 
  table, 
  deleteAction,
  createAction,
  updateAction
}: DataTableToolbarProps<TData>) {
    
  // Check if there are any active sorts or filters
  const hasActiveSorts = table.getState().sorting.length > 0
  const hasActiveFilters = table.getState().columnFilters.length > 0
  const hasActiveFiltersOrSorts = hasActiveSorts || hasActiveFilters

  // Check if there are selected rows
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedRowIds = selectedRows.map(row => (row.original as { id: string }).id)
  const selectedRowData = selectedRows.map(row => row.original)

  const clearAllFiltersAndSorts = () => {
    table.setSorting([])
    table.setColumnFilters([])
  }

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-2">
        <DataTableRowAdd 
          columns={table.getAllColumns().map(col => col.columnDef)}
          createAction={createAction}
        />
        {deleteAction && selectedRowIds.length > 0 && (
          <DataTableRowDelete
            selectedRowIds={selectedRowIds}
            deleteAction={deleteAction}
            onComplete={() => table.toggleAllRowsSelected(false)}
          />
        )}
        {selectedRowIds.length > 0 && updateAction && (
          <DataTableRowEdit
            columns={table.getAllColumns().map(col => col.columnDef)}
            selectedRows={selectedRowData}
            updateAction={updateAction}
          />
        )}
        <DataTableSort table={table} />
        <DataTableFilter table={table} />
        {hasActiveFiltersOrSorts && (
          <Button variant="outline" size="icon" onClick={clearAllFiltersAndSorts}>
            <X className="size-4 shrink-0" />
          </Button>
        )}
      </div>

      <DataTableViewOptions table={table} />

    </div>
  )
}