"use client"

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { type Column, Table } from "@tanstack/react-table"
import { GripVertical, Settings2 } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SortableColumnProps<TData> {
  column: Column<TData, unknown>
}

function SortableColumn<TData>({ column }: SortableColumnProps<TData>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative" as const,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-full items-center justify-between"
    >
      <DropdownMenuCheckboxItem
        className="w-full capitalize"
        checked={column.getIsVisible() ?? true}
        onCheckedChange={(value) => column.toggleVisibility(!!value)}
        onSelect={(event) => event.preventDefault()}
      >
        {column.columnDef.meta?.label ?? column.id}
      </DropdownMenuCheckboxItem>
      <Button
        variant="ghost"
        size="sm"
        className="cursor-grab hover:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </Button>
    </div>
  )
}

export function DataTableViewOptions<TData>({
  table,
}: {
  table: Table<TData>
}) {
  const { columnOrder } = table.getState()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string)
      const newIndex = columnOrder.indexOf(over.id as string)
      table.setColumnOrder(arrayMove(columnOrder, oldIndex, newIndex))
    }
  }

  // Get all columns for ordering (including non-hideable ones)
  const allColumns = table.getAllColumns()
  
  // Get only hideable columns for the view options display
  const hideableColumns = React.useMemo(() => {
    const columns =
      columnOrder.length > 0
        ? columnOrder
            .map((id) => table.getColumn(id))
            .filter(
              (col): col is Column<TData, unknown> => {
                if (!col || typeof col.accessorFn === "undefined") return false
                const canHide = col.getCanHide()
                return canHide === true
              }
            )
        : table
            .getAllColumns()
            .filter(
              (column) => {
                if (typeof column.accessorFn === "undefined") return false
                const canHide = column.getCanHide()
                return canHide === true
              }
            )
    return columns
  }, [columnOrder, table])

  // Initialize column order with all columns if not set
  React.useEffect(() => {
    if (columnOrder.length === 0 && allColumns.length > 0) {
      table.setColumnOrder(allColumns.map((c) => c.id))
    }
  }, [columnOrder.length, allColumns, table])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Settings2 />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={hideableColumns.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {hideableColumns.map((column) => (
              <SortableColumn key={column.id} column={column} />
            ))}
          </SortableContext>
        </DndContext>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
