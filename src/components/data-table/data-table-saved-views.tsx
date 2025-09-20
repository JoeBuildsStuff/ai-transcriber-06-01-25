"use client"

import { useEffect, useMemo, useState } from "react"
import { Telescope, GripVertical, Circle, CircleCheckBig, Trash2 } from "lucide-react"
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
import { useSortable } from "@dnd-kit/sortable"
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
import type { SavedViewRecord } from "@/actions/saved-views"
import Spinner from "../ui/spinner"

interface SortableViewItemProps {
  id: string
  view: SavedViewRecord
  isSelected: boolean
  onSelect: (view: SavedViewRecord) => void
  onDelete?: (viewId: string) => void
  isDeleting?: boolean
}

function SortableViewItem({ id, view, isSelected, onSelect, onDelete, isDeleting }: SortableViewItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <CommandItem
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-2 cursor-pointer"
      onSelect={() => onSelect(view)}
    >
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{view.name}</div>
          {view.description ? (
            <div className="text-sm text-muted-foreground truncate">{view.description}</div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDelete(view.id)
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Spinner size="sm" variant="red" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        ) : null}
        {isSelected ? (
          <CircleCheckBig className="size-4 shrink-0 text-primary" />
        ) : (
          <Circle className="size-4 shrink-0 text-muted-foreground" />
        )}
      </div>
    </CommandItem>
  )
}

interface DataTableSavedViewsProps {
  savedViews: SavedViewRecord[]
  selectedViewId: string | null
  onSelect: (view: SavedViewRecord) => void
  onDelete?: (viewId: string) => void
  isLoading?: boolean
  deletingViewId?: string | null
}

export default function DataTableSavedViews({
  savedViews,
  selectedViewId,
  onSelect,
  onDelete,
  isLoading = false,
  deletingViewId,
}: DataTableSavedViewsProps) {
  const [open, setOpen] = useState(false)
  const [localViews, setLocalViews] = useState(savedViews)

  useEffect(() => {
    setLocalViews(savedViews)
  }, [savedViews])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localViews.findIndex((view) => view.id === active.id)
      const newIndex = localViews.findIndex((view) => view.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        setLocalViews((views) => arrayMove(views, oldIndex, newIndex))
      }
    }
  }

  const selectedView = useMemo(
    () => localViews.find((view) => view.id === selectedViewId),
    [localViews, selectedViewId],
  )

  const hasViews = localViews.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Telescope className="size-4 shrink-0" strokeWidth={1.5} />
          Views
          {selectedView && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              ({selectedView.name})
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 rounded-xl" align="end">
        <Command className="rounded-xl">
          <CommandInput placeholder="Search views..." />
          <CommandList className="mx-0 px-0">
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Spinner size="sm" />
                  Loading views...
                </div>
              ) : (
                "No views found."
              )}
            </CommandEmpty>
            {hasViews ? (
              <CommandGroup className="p-1">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localViews.map((view) => view.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localViews.map((view) => (
                      <SortableViewItem
                        key={view.id}
                        id={view.id}
                        view={view}
                        isSelected={selectedViewId === view.id}
                        onSelect={(selected) => {
                          onSelect(selected)
                          setOpen(false)
                        }}
                        onDelete={onDelete}
                        isDeleting={deletingViewId === view.id}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
