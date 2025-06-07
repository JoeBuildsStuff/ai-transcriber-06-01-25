"use client"

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { type Table } from "@tanstack/react-table"
import { Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useMemo } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { SortableItem } from "./sortable-item"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const { columnOrder } = table.getState()
  const hidableColumns = useMemo(
    () =>
      table
        .getAllLeafColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== "undefined" && column.getCanHide()
        ),
    [table, columnOrder]
  )
  const hidableColumnIds = useMemo(
    () => hidableColumns.map((column) => column.id),
    [hidableColumns]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = hidableColumnIds.indexOf(active.id as string)
      const newIndex = hidableColumnIds.indexOf(over.id as string)
      const reorderedHidableColumnIds = arrayMove(
        hidableColumnIds,
        oldIndex,
        newIndex
      )

      const newColumnOrder = [...table.getAllLeafColumns().map((c) => c.id)]
      const hidableToInsert = [...reorderedHidableColumnIds]

      for (let i = 0; i < newColumnOrder.length; i++) {
        if (hidableColumnIds.includes(newColumnOrder[i])) {
          newColumnOrder[i] = hidableToInsert.shift()!
        }
      }

      table.setColumnOrder(newColumnOrder)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={hidableColumnIds}
            strategy={verticalListSortingStrategy}
          >
            {hidableColumns.map((column) => {
              return (
                <SortableItem key={column.id} id={column.id}>
                  <div className="w-full">
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  </div>
                </SortableItem>
              )
            })}
          </SortableContext>
        </DndContext>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
