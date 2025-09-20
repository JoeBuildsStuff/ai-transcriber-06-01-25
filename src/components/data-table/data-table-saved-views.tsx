"use client"

import { useState } from "react"
import { Telescope, GripVertical, Circle, CircleCheckBig } from "lucide-react"
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

// Test saved views data
const testSavedViews = [
  {
    id: "view-1",
    name: "All Meetings",
    description: "Show all meetings with default columns",
    filters: {},
    columnOrder: [],
    visibleColumns: []
  },
  {
    id: "view-2", 
    name: "Recent Meetings",
    description: "Last 30 days meetings only",
    filters: { dateRange: "last30days" },
    columnOrder: ["title", "date", "duration"],
    visibleColumns: ["title", "date", "duration", "attendees"]
  },
  {
    id: "view-3",
    name: "High Priority",
    description: "Meetings marked as high priority",
    filters: { priority: "high" },
    columnOrder: ["title", "priority", "date"],
    visibleColumns: ["title", "priority", "date", "attendees", "notes"]
  },
  {
    id: "view-4",
    name: "Team Meetings",
    description: "Internal team meetings only",
    filters: { type: "internal" },
    columnOrder: ["title", "team", "date"],
    visibleColumns: ["title", "team", "date", "duration", "attendees"]
  },
  {
    id: "view-5",
    name: "Client Meetings",
    description: "External client meetings",
    filters: { type: "external" },
    columnOrder: ["title", "client", "date"],
    visibleColumns: ["title", "client", "date", "duration", "notes"]
  }
]

interface SortableViewItemProps {
  id: string
  view: typeof testSavedViews[0]
  isSelected: boolean
  onSelect: () => void
}

function SortableViewItem({ id, view, isSelected, onSelect }: SortableViewItemProps) {
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
      onSelect={onSelect}
    >
      <div className="flex items-center space-x-2 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{view.name}</div>
          <div className="text-sm text-muted-foreground truncate">{view.description}</div>
        </div>
      </div>
      {isSelected ? (
        <CircleCheckBig className="size-4 shrink-0 text-primary" />
      ) : (
        <Circle className="size-4 shrink-0 text-muted-foreground" />
      )}
    </CommandItem>
  )
}

export default function DataTableSavedViews() {
  const [open, setOpen] = useState(false)
  const [savedViews, setSavedViews] = useState(testSavedViews)
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = savedViews.findIndex((view) => view.id === active.id)
      const newIndex = savedViews.findIndex((view) => view.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        setSavedViews((views) => arrayMove(views, oldIndex, newIndex))
      }
    }
  }

  const handleViewSelect = (viewId: string) => {
    setSelectedViewId(viewId)
    // Here you would typically apply the view's filters, column order, etc. to the table
    console.log("Selected view:", savedViews.find(v => v.id === viewId))
  }

  const selectedView = savedViews.find(v => v.id === selectedViewId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Telescope className="size-4 shrink-0" strokeWidth={1.5} />
          Views
          {selectedView && (
            <span className="text-xs text-muted-foreground">
              ({selectedView.name})
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0 rounded-xl" align="end">
        <Command className="rounded-xl">
          <CommandInput placeholder="Search views..." />
          <CommandList  className=" mx-0 px-0">
            <CommandEmpty>No views found.</CommandEmpty>
            <CommandGroup className="p-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={savedViews.map(view => view.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {savedViews.map((view) => (
                    <SortableViewItem
                      key={view.id}
                      id={view.id}
                      view={view}
                      isSelected={selectedViewId === view.id}
                      onSelect={() => handleViewSelect(view.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}