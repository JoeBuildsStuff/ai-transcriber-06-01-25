"use client"

import { useState } from "react"
import { Table } from "@tanstack/react-table"
import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableToolbarSort } from "./data-table-toolbar-sort"
import { DataTableToolbarFilter } from "./data-table-toolbar-filter"
import { DataTableToolbarGroup } from "./data-table-toolbar-group"
import { NewContactSheet } from "./new-contact-sheet"
import { SheetTrigger } from "@/components/ui/sheet"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const [isNewContactSheetOpen, setIsNewContactSheetOpen] = useState(false)
  const isFiltered = table.getState().columnFilters.length > 0
  const isSorted = table.getState().sorting.length > 0
  const isGrouped = table.getState().grouping.length > 0
  const hasActiveModifiers = isFiltered || isSorted || isGrouped

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <NewContactSheet
          open={isNewContactSheetOpen}
          onOpenChange={setIsNewContactSheetOpen}
        >
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="">
              <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1} />
            </Button>
          </SheetTrigger>
        </NewContactSheet>
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
