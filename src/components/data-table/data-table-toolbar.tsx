import { DataTableViewOptions } from "./data-table-view-options"
import { Table } from "@tanstack/react-table"
import DataTableFilter from "./data-table-filter"
import DataTableSort from "./data-table-sort"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DataTableToolbarProps<TData> {
    table: Table<TData>
  }

export default function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
    
  // Check if there are any active sorts or filters
  const hasActiveSorts = table.getState().sorting.length > 0
  const hasActiveFilters = table.getState().columnFilters.length > 0
  const hasActiveFiltersOrSorts = hasActiveSorts || hasActiveFilters

  const clearAllFiltersAndSorts = () => {
    table.setSorting([])
    table.setColumnFilters([])
  }

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-2">
        <DataTableSort table={table} />
        <DataTableFilter table={table} />
        {hasActiveFiltersOrSorts && (
          <Button variant="outline" size="icon" onClick={clearAllFiltersAndSorts}>
            <X className="size-4 cursor-pointer" />
          </Button>
        )}
      </div>

      <DataTableViewOptions table={table} />

    </div>
  )
}