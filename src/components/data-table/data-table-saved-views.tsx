"use client"

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { Table } from "@tanstack/react-table"
import {
  Circle,
  CircleCheckBig,
  GripVertical,
  Pin,
  Telescope,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
  deleteView,
  listSavedViews,
  saveView,
  type SavedViewRecord,
} from "@/actions/saved-views"
import {
  generateSavedViewSuggestion,
  type SuggestionSummary,
} from "@/lib/saved-view-suggestion"
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

interface DataTableSavedViewsProps<TData> {
  table: Table<TData>
  tableKey: string
}

export default function DataTableSavedViews<TData>({ table, tableKey }: DataTableSavedViewsProps<TData>) {
  const [open, setOpen] = useState(false)
  const [savedViews, setSavedViews] = useState<SavedViewRecord[]>([])
  const [localViews, setLocalViews] = useState<SavedViewRecord[]>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [viewName, setViewName] = useState("")
  const [viewDescription, setViewDescription] = useState("")
  const [isLoadingViews, setIsLoadingViews] = useState(false)
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()
  const [isDeleting, startDeleting] = useTransition()
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [nameEdited, setNameEdited] = useState(false)
  const [descriptionEdited, setDescriptionEdited] = useState(false)
  const suggestionSignatureRef = useRef<string | null>(null)
  const suggestionAbortControllerRef = useRef<AbortController | null>(null)
  const suggestionInFlightRef = useRef(false)
  const nameEditedRef = useRef(nameEdited)
  const descriptionEditedRef = useRef(descriptionEdited)

  useEffect(() => {
    nameEditedRef.current = nameEdited
  }, [nameEdited])

  useEffect(() => {
    descriptionEditedRef.current = descriptionEdited
  }, [descriptionEdited])

  useEffect(() => {
    setLocalViews(savedViews)
  }, [savedViews])

  useEffect(() => {
    let isActive = true
    setIsLoadingViews(true)
    setSelectedViewId(null)
    setViewName("")
    setViewDescription("")
    setNameEdited(false)
    setDescriptionEdited(false)
    suggestionSignatureRef.current = null

    listSavedViews(tableKey)
      .then((result) => {
        if (!isActive) return

        if (result.success && result.data) {
          setSavedViews(result.data)
        } else if (result.error) {
          toast.error(result.error)
        }
      })
      .catch((error) => {
        console.error("Failed to load saved views", error)
        toast.error("Something went wrong loading saved views.")
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingViews(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [tableKey])

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

  const { columnFilters, sorting, columnVisibility, columnOrder } = table.getState()

  const isFiltered = columnFilters.length > 0
  const isSorted = sorting.length > 0
  const hasVisibilityChanges = Object.keys(columnVisibility ?? {}).length > 0
  const hasColumnOrderChanges = (columnOrder ?? []).length > 0

  const canSaveView = isFiltered || isSorted || hasVisibilityChanges || hasColumnOrderChanges

  const suggestionSummary = useMemo<SuggestionSummary | null>(() => {
    if (!canSaveView) {
      return null
    }

    const columns = table.getAllColumns()

    const hiddenColumns = Array.from(
      new Set(columns.filter((column) => !column.getIsVisible()).map((column) => column.id)),
    )

    const visibleColumns = Array.from(
      new Set(columns.filter((column) => column.getIsVisible()).map((column) => column.id)),
    )

    return {
      tableKey,
      filters: columnFilters.map((filter) => ({
        column: filter.id,
        value: filter.value ?? null,
      })),
      sorting: sorting.map((sort) => ({
        column: sort.id,
        direction: sort.desc ? "desc" : "asc",
      })),
      hiddenColumns,
      visibleColumns,
      columnOrder: columnOrder ?? [],
    }
  }, [canSaveView, table, columnFilters, sorting, columnOrder, tableKey])

  const suggestionSignature = useMemo(() => {
    if (!suggestionSummary) {
      return null
    }

    return JSON.stringify(suggestionSummary)
  }, [suggestionSummary])

  useEffect(() => {
    if (!saveDialogOpen) {
      suggestionSignatureRef.current = null
      setIsSuggesting(false)
      suggestionAbortControllerRef.current?.abort()
      suggestionAbortControllerRef.current = null
      suggestionInFlightRef.current = false
      return
    }

    if (!suggestionSummary || !suggestionSignature) {
      return
    }

    if (!canSaveView || nameEditedRef.current) {
      return
    }

    if (suggestionInFlightRef.current) {
      return
    }

    if (suggestionSignatureRef.current === suggestionSignature) {
      return
    }

    const controller = new AbortController()
    suggestionAbortControllerRef.current?.abort()
    suggestionAbortControllerRef.current = controller
    suggestionInFlightRef.current = true
    suggestionSignatureRef.current = suggestionSignature
    setIsSuggesting(true)

    generateSavedViewSuggestion(suggestionSummary, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return

        if (!nameEditedRef.current && result.name) {
          setViewName(result.name)
        }

        if (!descriptionEditedRef.current && typeof result.description === "string") {
          setViewDescription(result.description)
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        console.error("Failed to generate view suggestion", error)
        toast.error("Could not draft a suggested view name.")
        suggestionSignatureRef.current = null
      })
      .finally(() => {
        if (controller.signal.aborted) {
          suggestionInFlightRef.current = false
          return
        }

        suggestionAbortControllerRef.current = null
        suggestionInFlightRef.current = false
        setIsSuggesting(false)
      })

    return () => {
      controller.abort()
      suggestionAbortControllerRef.current = null
      suggestionInFlightRef.current = false
      suggestionSignatureRef.current = null
    }
  }, [saveDialogOpen, canSaveView, suggestionSummary, suggestionSignature])

  useEffect(() => {
    if (saveDialogOpen) {
      return
    }

    setViewName("")
    setViewDescription("")
    setNameEdited(false)
    setDescriptionEdited(false)
    suggestionSignatureRef.current = null
    setIsSuggesting(false)
  }, [saveDialogOpen])

  const handleReset = () => {
    table.resetColumnFilters(true)
    table.resetSorting(true)
    table.resetColumnVisibility(true)
    table.resetColumnOrder(true)
    table.resetRowSelection()
    setSelectedViewId(null)
  }

  const handleOpenSaveDialog = () => {
    const defaultName = viewName.trim().length > 0 ? viewName : `View ${savedViews.length + 1}`
    setViewName(defaultName)
    setViewDescription("")
    setNameEdited(false)
    setDescriptionEdited(false)
    suggestionSignatureRef.current = null
    setSaveDialogOpen(true)
  }

  const handleSaveView = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = viewName.trim()
    if (!trimmedName) {
      toast.error("Give your view a name before saving.")
      return
    }

    const state = table.getState()

    startSaving(async () => {
      const result = await saveView({
        tableKey,
        name: trimmedName,
        description: viewDescription.trim() || undefined,
        state: {
          sorting: state.sorting ?? [],
          columnFilters: state.columnFilters ?? [],
          columnVisibility: state.columnVisibility ?? {},
          columnOrder: state.columnOrder ?? [],
          pagination: state.pagination,
        },
      })

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to save view.")
        return
      }

      setSavedViews((prev) => {
        const deduped = prev.filter((view) => view.id !== result.data!.id)
        return [result.data!, ...deduped].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
      })

      setSelectedViewId(result.data.id)
      setSaveDialogOpen(false)
      setViewName("")
      setViewDescription("")
      toast.success("View saved", {
        description: `Saved as ${result.data.name}`,
      })
    })
  }

  const applyViewToTable = (view: SavedViewRecord) => {
    const nextState = view.state ?? {
      sorting: [],
      columnFilters: [],
      columnVisibility: {},
      columnOrder: [],
    }

    table.setSorting(nextState.sorting ?? [])
    table.setColumnFilters(nextState.columnFilters ?? [])
    table.setColumnVisibility(nextState.columnVisibility ?? {})
    table.setColumnOrder(nextState.columnOrder ?? [])

    if (nextState.pagination) {
      const { pageIndex, pageSize } = nextState.pagination
      if (typeof pageSize === "number") {
        table.setPageSize(pageSize)
      }
      if (typeof pageIndex === "number") {
        table.setPageIndex(pageIndex)
      }
    }

    table.resetRowSelection()
    setSelectedViewId(view.id)
    toast.success("View applied", {
      description: view.name,
    })
  }

  const handleDeleteView = (viewId: string) => {
    setDeletingViewId(viewId)
    startDeleting(async () => {
      const result = await deleteView(viewId)

      if (!result.success) {
        toast.error(result.error ?? "Failed to delete view.")
        setDeletingViewId(null)
        return
      }

      setSavedViews((prev) => prev.filter((view) => view.id !== viewId))
      if (selectedViewId === viewId) {
        setSelectedViewId(null)
      }

      toast.success("View deleted")
      setDeletingViewId(null)
    })
  }

  const deletingInProgress = isDeleting ? deletingViewId : null

  const selectedView = useMemo(
    () => localViews.find((view) => view.id === selectedViewId) ?? null,
    [localViews, selectedViewId],
  )

  const hasViews = localViews.length > 0

  return (
    <>
      <div className="flex items-center gap-2">
        {canSaveView ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1"
          >
            Reset
            <X className="h-4 w-4" />
          </Button>
        ) : null}

        {canSaveView ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenSaveDialog}
            disabled={isSaving}
            className="flex items-center gap-1"
          >
            {isSaving ? (
              <Spinner />
            ) : (
              <>
                Save View
                <Pin className="size-4 shrink-0" />
              </>
            )}
          </Button>
        ) : null}

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
                  {isLoadingViews ? (
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
                              applyViewToTable(selected)
                              setOpen(false)
                            }}
                            onDelete={handleDeleteView}
                            isDeleting={deletingInProgress === view.id}
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
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveView} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Save Current View</DialogTitle>
              <DialogDescription>
                Store the current filters, sorting, and column preferences as a reusable view.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="view-name" className="flex items-center gap-2">
                <span>Name</span>
                {isSuggesting && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Spinner size="sm" />
                    Drafting suggestion…
                  </span>
                )}
              </Label>
              <Input
                id="view-name"
                value={viewName}
                onChange={(event) => {
                  if (!nameEdited) {
                    setNameEdited(true)
                  }
                  setViewName(event.target.value)
                }}
                autoFocus
                placeholder="e.g. Last 30 days"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="view-description">Description</Label>
              <Textarea
                id="view-description"
                value={viewDescription}
                onChange={(event) => {
                  if (!descriptionEdited) {
                    setDescriptionEdited(true)
                  }
                  setViewDescription(event.target.value)
                }}
                placeholder="Optional description to remind you what this view shows"
                rows={3}
                disabled={isSaving}
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Spinner /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
