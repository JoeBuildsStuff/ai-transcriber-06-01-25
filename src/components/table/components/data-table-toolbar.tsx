"use client"

import { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableToolbarSort } from "./data-table-toolbar-sort"
import { DataTableToolbarFilter } from "./data-table-toolbar-filter"
import { DataTableToolbarGroup } from "./data-table-toolbar-group"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const isSorted = table.getState().sorting.length > 0
  const isGrouped = table.getState().grouping.length > 0
  const hasActiveModifiers = isFiltered || isSorted || isGrouped

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <DataTableToolbarFilter table={table} />
        <DataTableToolbarSort table={table} />
        <DataTableToolbarGroup table={table} />
        {hasActiveModifiers && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters()
              table.resetSorting()
              table.setGrouping([])
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
