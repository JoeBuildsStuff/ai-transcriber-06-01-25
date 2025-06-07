"use client"

import { Table } from "@tanstack/react-table"
import { Network } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { X } from "lucide-react"
import { useState } from "react"

interface DataTableGroupProps<TData> {
  table: Table<TData>
}

export function DataTableToolbarGroup<TData>({
  table,
}: DataTableGroupProps<TData>) {
  const [stagedGrouping, setStagedGrouping] = useState(table.getState().grouping)
  const [open, setOpen] = useState(false)
  const columns = table.getAllColumns().filter(column => column.getCanGroup())

  const handleApplyGrouping = () => {
    table.setGrouping(stagedGrouping)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Network className="h-4 w-4 text-muted-foreground" strokeWidth={1}/>
          Grouped by <Badge variant="blue">{table.getState().grouping.length}</Badge> column(s)
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="start">
        <div className="space-y-4 p-4">
          {/* Existing group rules */}
          {stagedGrouping.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No grouping applied to this view
            </div>
          ) : (
            stagedGrouping.map((groupId, index) => {
              const column = table.getColumn(groupId)
              if (!column) return null

              return (
                <div key={groupId} className="flex items-center space-x-2">
                  <div className="flex flex-1 items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {index === 0 ? "group by" : "then by"}
                    </span>
                    <Select
                      value={groupId}
                      onValueChange={(newColumnId) => {
                        setStagedGrouping(old => 
                          old.map((oldGroup, i) => 
                            i === index ? newColumnId : oldGroup
                          )
                        )
                      }}
                    >
                      <SelectTrigger className="w-fit">
                        <SelectValue>
                          {(() => {
                            const column = table.getColumn(groupId)
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setStagedGrouping(old => old.filter((_, i) => i !== index))
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}

          {/* Add new group rule */}
          <Separator />
          <div className="flex items-center justify-between space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                const firstAvailableColumn = columns[0]
                if (firstAvailableColumn) {
                  setStagedGrouping(old => [...old, firstAvailableColumn.id])
                }
              }}
            >
              Add Group
            </Button>

            <Button 
              onClick={handleApplyGrouping}
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