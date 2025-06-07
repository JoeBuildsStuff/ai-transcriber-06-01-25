"use client"

import { Table } from "@tanstack/react-table"
import { ArrowDownUp, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

interface DataTableSortingProps<TData> {
  table: Table<TData>
}

export function DataTableToolbarSort<TData>({
  table,
}: DataTableSortingProps<TData>) {
  const [stagedSorting, setStagedSorting] = useState(table.getState().sorting)
  const [open, setOpen] = useState(false)
  const columns = table.getAllColumns().filter(column => column.getCanSort())

  const handleApplySorting = () => {
    table.setSorting(stagedSorting)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <ArrowDownUp className="h-4 w-4" />
          Sorted by <Badge variant="blue">{table.getState().sorting.length}</Badge> rule(s)
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="start">
        <div className="space-y-4 p-4">
          {/* Existing sort rules */}
          {stagedSorting.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No sorting applied to this view
            </div>
          ) : (
            stagedSorting.map((sort, index) => {
              const column = table.getColumn(sort.id)
              if (!column) return null

              return (
                <div key={sort.id} className="flex items-center space-x-2">
                  <div className="flex flex-1 items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {index === 0 ? "sort by" : "then by"}
                    </span>
                    <Select
                      value={sort.id}
                      onValueChange={(newColumnId) => {
                        setStagedSorting(old => 
                          old.map((oldSort, i) => 
                            i === index 
                              ? { ...oldSort, id: newColumnId }
                              : oldSort
                          )
                        )
                      }}
                    >
                      <SelectTrigger className="w-fit">
                        <SelectValue>
                          {(() => {
                            const column = table.getColumn(sort.id)
                            const header = column?.columnDef.header
                            return typeof header === 'string' 
                              ? header 
                              : column?.id || 'Select column'
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(column => {
                          const header = column.columnDef.header
                          return (
                            <SelectItem key={column.id} value={column.id}>
                              {typeof header === 'string' 
                                ? header 
                                : column.id}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <span>ascending:</span>
                    <Switch 
                      checked={!sort.desc}
                      onCheckedChange={(checked) => {
                        setStagedSorting(old => 
                          old.map((oldSort, i) => 
                            i === index ? { ...oldSort, desc: !checked } : oldSort
                          )
                        )
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setStagedSorting(old => old.filter((_, i) => i !== index))
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}

          {/* Add new sort rule */}
          <Separator />
          <div className="flex items-center justify-between space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                const firstAvailableColumn = columns[0]
                if (firstAvailableColumn) {
                  setStagedSorting(old => [
                    ...old,
                    { id: firstAvailableColumn.id, desc: false }
                  ])
                }
              }}
            >
              Add Sort
            </Button>

            <Button 
              onClick={handleApplySorting}
              className="ml-auto"
              variant="secondary"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
