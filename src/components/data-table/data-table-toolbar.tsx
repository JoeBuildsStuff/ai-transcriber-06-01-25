"use client"

import * as React from "react"
import { Table } from "@tanstack/react-table"
import { Pin, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"

import DataTableFilter from "./data-table-filter"
import DataTableSort from "./data-table-sort"
import DataTableRowAdd from "./data-table-row-add"
import DataTableRowEditSingle from "./data-table-row-edit-single"
import DataTableRowEditMulti from "./data-table-row-edit-multi"
import DataTableRowDelete from "./data-table-row-delete"
import { DataTableViewOptions } from "./data-table-view-options"
import DataTableSavedViews from "./data-table-saved-views"
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

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  tableKey: string
  deleteAction?: (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  updateActionSingle?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  updateActionMulti?: (ids: string[], data: Partial<TData>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  customAddForm?: React.ComponentType<{
    onSuccess?: () => void
    onCancel?: () => void
    createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
  customEditFormSingle?: React.ComponentType<{
    data: TData
    onSuccess?: () => void
    onCancel?: () => void
    updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
  customEditFormMulti?: React.ComponentType<{
    selectedCount: number
    onSuccess?: () => void
    onCancel?: () => void
    updateActionMulti?: (ids: string[], data: Partial<TData>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  }>
}

export default function DataTableToolbar<TData>({
  table,
  tableKey,
  deleteAction,
  createAction,
  updateActionSingle,
  updateActionMulti,
  customAddForm,
  customEditFormSingle,
  customEditFormMulti,
}: DataTableToolbarProps<TData>) {
  const [savedViews, setSavedViews] = React.useState<SavedViewRecord[]>([])
  const [selectedViewId, setSelectedViewId] = React.useState<string | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false)
  const [viewName, setViewName] = React.useState("")
  const [viewDescription, setViewDescription] = React.useState("")
  const [isLoadingViews, setIsLoadingViews] = React.useState(false)
  const [deletingViewId, setDeletingViewId] = React.useState<string | null>(null)
  const [isSaving, startSaving] = React.useTransition()
  const [isDeleting, startDeleting] = React.useTransition()
  const [isSuggesting, setIsSuggesting] = React.useState(false)
  const [nameEdited, setNameEdited] = React.useState(false)
  const [descriptionEdited, setDescriptionEdited] = React.useState(false)
  const suggestionSignatureRef = React.useRef<string | null>(null)

  // Load saved views for this table key on mount / change
  React.useEffect(() => {
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

  // Get selected rows data
  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original)
  const selectedRowIds = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => {
      const rowData = row.original as Record<string, unknown>
      return String(rowData.id || "")
    })
    .filter(Boolean)

  const handleDeleteComplete = () => {
    table.resetRowSelection()
  }

  const { columnFilters, sorting, columnVisibility, columnOrder } = table.getState()

  const isFiltered = columnFilters.length > 0
  const isSorted = sorting.length > 0
  const hasVisibilityChanges = Object.keys(columnVisibility ?? {}).length > 0
  const hasColumnOrderChanges = (columnOrder ?? []).length > 0

  const canSaveView = isFiltered || isSorted || hasVisibilityChanges || hasColumnOrderChanges

  React.useEffect(() => {
    if (!saveDialogOpen) {
      suggestionSignatureRef.current = null
      setIsSuggesting(false)
      return
    }

    if (!canSaveView || nameEdited || isSuggesting) {
      return
    }

    const hiddenColumns = Array.from(
      new Set(
        table
          .getAllColumns()
          .filter((column) => !column.getIsVisible())
          .map((column) => column.id),
      ),
    )

    const visibleColumns = Array.from(
      new Set(
        table
          .getAllColumns()
          .filter((column) => column.getIsVisible())
          .map((column) => column.id),
      ),
    )

    const summary: SuggestionSummary = {
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

    const signature = JSON.stringify(summary)
    if (suggestionSignatureRef.current === signature) {
      return
    }

    suggestionSignatureRef.current = signature

    const controller = new AbortController()
    setIsSuggesting(true)

    generateSavedViewSuggestion(summary, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return

        if (!nameEdited && result.name) {
          setViewName(result.name)
        }

        if (!descriptionEdited && typeof result.description === "string") {
          setViewDescription(result.description)
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          suggestionSignatureRef.current = null
          return
        }

        console.error("Failed to generate view suggestion", error)
        toast.error("Could not draft a suggested view name.")
        suggestionSignatureRef.current = null
      })
      .finally(() => {
        setIsSuggesting(false)
      })

    return () => {
      suggestionSignatureRef.current = null
      controller.abort()
    }
  }, [
    saveDialogOpen,
    canSaveView,
    columnFilters,
    sorting,
    columnOrder,
    table,
    nameEdited,
    descriptionEdited,
    tableKey,
    isSuggesting,
  ])

  const handleReset = () => {
    table.resetColumnFilters(true)
    table.resetSorting(true)
    table.resetColumnVisibility(true)
    table.resetColumnOrder(true)
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

  React.useEffect(() => {
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

  const handleSaveView = (event: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Action Buttons */}
        {createAction && (
          <DataTableRowAdd
            columns={table.getAllColumns().map((col) => col.columnDef)}
            createAction={createAction}
            customForm={customAddForm}
          />
        )}
        {updateActionSingle && (
          <DataTableRowEditSingle
            columns={table.getAllColumns().map((col) => col.columnDef)}
            selectedRows={selectedRows}
            updateActionSingle={updateActionSingle}
            customForm={customEditFormSingle}
          />
        )}
        {updateActionMulti && (
          <DataTableRowEditMulti
            columns={table.getAllColumns().map((col) => col.columnDef)}
            selectedRows={selectedRows}
            selectedRowIds={selectedRowIds}
            updateActionMulti={updateActionMulti}
            customForm={customEditFormMulti}
          />
        )}
        {deleteAction && selectedRowIds.length > 0 && (
          <DataTableRowDelete
            selectedRowIds={selectedRowIds}
            deleteAction={deleteAction}
            onComplete={handleDeleteComplete}
          />
        )}

        {/* Sort Controls */}
        <DataTableSort table={table} />

        {/* Column Filters */}
        <DataTableFilter table={table} />

        {/* Clear filters / Save view */}
        {canSaveView && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              className="flex items-center gap-1"
            >
              Reset
              <X className="h-4 w-4" />
            </Button>

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
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Saved Views */}
          <DataTableSavedViews
            savedViews={savedViews}
            selectedViewId={selectedViewId}
            onSelect={applyViewToTable}
            onDelete={handleDeleteView}
            isLoading={isLoadingViews}
            deletingViewId={deletingInProgress}
          />

          {/* Column visibility toggle */}
          <DataTableViewOptions table={table} />
        </div>
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
