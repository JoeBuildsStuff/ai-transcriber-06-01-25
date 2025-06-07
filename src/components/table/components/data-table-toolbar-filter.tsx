"use client"

import { Table } from "@tanstack/react-table"
import { Filter, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface DataTableFilterProps<TData> {
  table: Table<TData>
}

const operatorOptions = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater than or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less than or equal' },
  { value: 'like', label: 'contains' },
]

export function DataTableToolbarFilter<TData>({
  table,
}: DataTableFilterProps<TData>) {
  const [stagedFilters, setStagedFilters] = useState(table.getState().columnFilters)
  const [open, setOpen] = useState(false)
  const columns = table.getAllColumns().filter(column => column.getCanFilter())

  const handleApplyFilters = () => {
    table.setColumnFilters(stagedFilters)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Filter className="h-4 w-4" />
          Filtered by <Badge variant="blue">{table.getState().columnFilters.length}</Badge> rule(s)
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="start">
        <div className="space-y-4 p-4">
          {/* Existing filter rules */}
          {stagedFilters.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No filters applied to this view
            </div>
          ) : (
            stagedFilters.map((filter, index) => {
              const column = table.getColumn(filter.id)
              if (!column) return null
              const [operator, value] = (filter.value as string).split(':')

              return (
                <div key={filter.id} className="flex items-center space-x-2">
                  <div className="flex flex-1 items-center space-x-2">
                    <Select
                      value={filter.id}
                      onValueChange={(newColumnId) => {
                        setStagedFilters(old => 
                          old.map((oldFilter, i) => 
                            i === index 
                              ? { ...oldFilter, id: newColumnId }
                              : oldFilter
                          )
                        )
                      }}
                    >
                      <SelectTrigger className="w-fit">
                        <SelectValue>
                          {(() => {
                            const column = table.getColumn(filter.id)
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
                    <Select
                      value={operator}
                      onValueChange={(newOperator) => {
                        setStagedFilters(old => 
                          old.map((oldFilter, i) => 
                            i === index 
                              ? { ...oldFilter, value: `${newOperator}:${value}` }
                              : oldFilter
                          )
                        )
                      }}
                    >
                      <SelectTrigger className="h-8 w-fit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorOptions.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={value}
                      onChange={(e) => {
                        setStagedFilters(old =>
                          old.map((oldFilter, i) =>
                            i === index
                              ? { ...oldFilter, value: `${operator}:${e.target.value}` }
                              : oldFilter
                          )
                        )
                      }}
                      className="h-8 w-fit"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setStagedFilters(old => 
                        old.filter((_, i) => i !== index)
                      )
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })
          )}

          {/* Add new filter rule */}
          <Separator />
          <div className="flex items-center justify-between space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                const firstAvailableColumn = columns[0]
                if (firstAvailableColumn) {
                  setStagedFilters(old => [
                    ...old,
                    { id: firstAvailableColumn.id, value: 'eq:' }
                  ])
                }
              }}
            >
              Add Filter
            </Button>

            <Button 
              onClick={handleApplyFilters}
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