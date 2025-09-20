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
  Settings,
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

import { Badge } from "@/components/ui/badge"
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
import { dataTableConfig, type FilterOperator } from "@/lib/data-table"
import Spinner from "../ui/spinner"

// Helper function to get operator label
function getOperatorLabel(operator: FilterOperator): string {
  const allOperators = [
    ...dataTableConfig.textOperators,
    ...dataTableConfig.numericOperators,
    ...dataTableConfig.dateOperators,
    ...dataTableConfig.selectOperators,
    ...dataTableConfig.multiSelectOperators,
    ...dataTableConfig.booleanOperators,
  ]
  return allOperators.find(op => op.value === operator)?.label ?? operator
}

// Helper function to format filter value for display
function formatFilterValue(value: unknown, variant: string, operator: FilterOperator): string {
  if (["isEmpty", "isNotEmpty"].includes(operator)) {
    return ""
  }
  
  if (Array.isArray(value)) {
    if (operator === "isBetween" && value.length === 2) {
      return `${value[0]} - ${value[1]}`
    }
    return value.join(", ")
  }
  
  if (variant === "date" && typeof value === "string") {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit", 
        year: "2-digit",
      }).format(new Date(value))
    } catch {
      return String(value)
    }
  }
  
  if (variant === "boolean" && typeof value === "string") {
    return value === "true" ? "True" : "False"
  }
  
  return String(value)
}

// Helper function to format column name for display
function getColumnDisplayName<TData>(columnId: string, table: Table<TData>): string {
  const column = table.getColumn(columnId)
  return column?.columnDef.meta?.label ?? columnId
}

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
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
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
      setDialogMode("create")
      suggestionSignatureRef.current = null
      setIsSuggesting(false)
      suggestionAbortControllerRef.current?.abort()
      suggestionAbortControllerRef.current = null
      suggestionInFlightRef.current = false
      return
    }

    if (dialogMode === "edit") {
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
  }, [saveDialogOpen, canSaveView, suggestionSummary, suggestionSignature, dialogMode])

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

  const selectedView = useMemo(
    () => localViews.find((view) => view.id === selectedViewId) ?? null,
    [localViews, selectedViewId],
  )

  const handleOpenSaveDialog = () => {
    if (selectedView) {
      setDialogMode("edit")
      setViewName(selectedView.name)
      setViewDescription(selectedView.description ?? "")
    } else {
      const defaultName = viewName.trim().length > 0 ? viewName : `View ${savedViews.length + 1}`
      setDialogMode("create")
      setViewName(defaultName)
      setViewDescription("")
    }

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
    const isEditing = dialogMode === "edit" && Boolean(selectedViewId)

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
        viewId: isEditing ? selectedViewId ?? undefined : undefined,
      })

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to save view.")
        return
      }

      setSavedViews((prev) => {
        if (!result.data) return prev
        const deduped = prev.filter((view) => view.id !== result.data!.id)
        return [result.data!, ...deduped].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
      })

      setSelectedViewId(result.data.id)
      setSaveDialogOpen(false)
      setViewName("")
      setViewDescription("")
      toast.success(isEditing ? "View updated" : "View saved", {
        description: result.data.name,
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

  const hasViews = localViews.length > 0
  const showSaveButton = canSaveView || Boolean(selectedView)
  const saveButtonLabel = selectedView ? selectedView.name : "Save View"
  const dialogTitle = dialogMode === "edit" ? "Edit Saved View" : "Save Current View"
  const dialogDescription = dialogMode === "edit"
    ? "Update how this view is labeled. Any current filters, sorting, and column preferences will be saved again."
    : "Store the current filters, sorting, and column preferences as a reusable view."
  const submitLabel = dialogMode === "edit" ? "Update" : "Save"

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
            <X className="h-4 w-4" />
            Reset
          </Button>
        ) : null}

        {showSaveButton ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSaveDialog}
            disabled={isSaving}
            className="flex items-center gap-1"
          >
            {isSaving ? (
              <Spinner />
            ) : (
              <>
                {selectedView ? (
                  <Settings className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Pin className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span>{saveButtonLabel}</span>
              </>
            )}
          </Button>
        ) : null}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Telescope className="w-4 h-4" />
              <div>Views</div>
              <Badge variant="secondary">
                {localViews.length}
              </Badge>
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
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
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

            {/* Show applied view filter and sort details */}
            {canSaveView && (
              <div className="space-y-3">
                <Label>Applied Filters & Sorts</Label>
                
                {/* Display Filters */}
                {columnFilters.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Filters:</div>
                    <div className="space-y-1">
                      {columnFilters.map((filter, index) => {
                        const filterValue = filter.value as { operator?: string; value?: unknown; variant?: string } | undefined
                        const operator = filterValue?.operator ?? "iLike"
                        const value = filterValue?.value ?? ""
                        const variant = filterValue?.variant ?? "text"
                        const columnName = getColumnDisplayName(filter.id, table)
                        const operatorLabel = getOperatorLabel(operator as FilterOperator)
                        const formattedValue = formatFilterValue(value, variant, operator as FilterOperator)
                        
                        return (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {columnName}
                            </Badge>
                            <span className="text-muted-foreground">{operatorLabel}</span>
                            {formattedValue && (
                              <Badge variant="secondary" className="text-xs">
                                {formattedValue}
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Display Sorts */}
                {sorting.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Sorts:</div>
                    <div className="space-y-1">
                      {sorting.map((sort, index) => {
                        const columnName = getColumnDisplayName(sort.id, table)
                        const direction = sort.desc ? "Descending" : "Ascending"
                        
                        return (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {columnName}
                            </Badge>
                            <span className="text-muted-foreground">{direction}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Display Column Visibility Changes */}
                {hasVisibilityChanges && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Hidden Columns:</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(columnVisibility)
                        .filter(([, visible]) => !visible)
                        .map(([columnId]) => {
                          const columnName = getColumnDisplayName(columnId, table)
                          return (
                            <Badge key={columnId} variant="secondary" className="text-xs">
                              {columnName}
                            </Badge>
                          )
                        })}
                    </div>
                  </div>
                )}
                
                {/* Display Column Order Changes */}
                {hasColumnOrderChanges && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Column Order:</div>
                    <div className="flex flex-wrap gap-1">
                      {columnOrder?.map((columnId) => {
                        const columnName = getColumnDisplayName(columnId, table)
                        return (
                          <Badge key={columnId} variant="outline" className="text-xs">
                            {columnName}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Spinner /> : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
