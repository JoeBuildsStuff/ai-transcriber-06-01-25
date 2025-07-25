"use client"

import { useState } from "react"
import { Table, Column } from "@tanstack/react-table"
import { Settings2, Circle, CircleCheckBig, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SortableItemProps<TData> {
  id: string
  column: Column<TData, unknown>
  isVisible: boolean
  onToggleVisibility: () => void
}

function SortableItem<TData>({ id, column, isVisible, onToggleVisibility }: SortableItemProps<TData>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <CommandItem
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between cursor-pointer"
      onSelect={onToggleVisibility}
    >
      <div className="flex items-center space-x-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <span className="capitalize">{column.id}</span>
      </div>
      {isVisible ? (
        <CircleCheckBig className="size-4 shrink-0" />
      ) : (
        <Circle className="size-4 shrink-0" />
      )}
    </CommandItem>
  )
}

export function DataTableViewOptions<TData>({
  table,
}: {
  table: Table<TData>
}) {
  const [open, setOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Get all hideable columns
  const hideableColumns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" && column.getCanHide()
    )

  // Get current column order or use the original order
  const currentOrder = table.getState().columnOrder
  const orderedColumns = currentOrder.length > 0 
    ? currentOrder
        .map(id => hideableColumns.find(col => col.id === id))
        .filter((c): c is NonNullable<typeof c> => c !== undefined)
        .concat(hideableColumns.filter(col => !currentOrder.includes(col.id)))
    : hideableColumns

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = orderedColumns.findIndex((col) => col?.id === active.id)
      const newIndex = orderedColumns.findIndex((col) => col?.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderedColumns = arrayMove(orderedColumns, oldIndex, newIndex)
        const newColumnOrder = newOrderedColumns.map(col => col!.id)
        
        const allColumnIds = table.getAllColumns().map(col => col.id)
        const hideableColumnIds = hideableColumns.map(col => col.id)

        const currentFullOrder = table.getState().columnOrder.length > 0
          ? table.getState().columnOrder
          : allColumnIds

        let hideableIndex = 0
        const newFullOrder = currentFullOrder.map(id => {
          if (hideableColumnIds.includes(id)) {
            return newColumnOrder[hideableIndex++]
          }
          return id
        })

        table.setColumnOrder(newFullOrder)
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex ml-auto"
          size="sm"
        >
          <Settings2 className="size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="end">
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedColumns.map(col => col!.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {orderedColumns.map((column) => {
                     if (!column) return null
                     const isVisible = column.getIsVisible()
                     return (
                       <SortableItem<TData>
                         key={column.id}
                         id={column.id}
                         column={column}
                         isVisible={isVisible}
                         onToggleVisibility={() => column.toggleVisibility(!isVisible)}
                       />
                     )
                   })}
                </SortableContext>
              </DndContext>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
