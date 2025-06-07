"use client"

import { useState } from "react"
import { Table } from "@tanstack/react-table"
import { Plus, X, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableToolbarSort } from "./data-table-toolbar-sort"
import { DataTableToolbarFilter } from "./data-table-toolbar-filter"
import { DataTableToolbarGroup } from "./data-table-toolbar-group"
import { NewContactSheet } from "./new-contact-sheet"
import { SheetTrigger } from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteMultipleContacts } from "@/actions/contacts"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const [isNewContactSheetOpen, setIsNewContactSheetOpen] = useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length
  
  const isFiltered = table.getState().columnFilters.length > 0
  const isSorted = table.getState().sorting.length > 0
  const isGrouped = table.getState().grouping.length > 0
  const hasActiveModifiers = isFiltered || isSorted || isGrouped

  const handleBulkDelete = async () => {
    const contactIds = selectedRows.map(row => row.getValue('id') as string)
    
    setIsDeleting(true)
    try {
      const result = await deleteMultipleContacts(contactIds)
      
      if (result?.error) {
        toast.error("Failed to delete contacts", {
          description: result.error
        })
      } else {
        toast.success(`Successfully deleted ${contactIds.length} contact(s)`)
        table.resetRowSelection() // Clear selection after successful delete
        setIsBulkDeleteDialogOpen(false)
      }
    } catch (error) {
      console.error('Error deleting contacts:', error)
      toast.error("Failed to delete contacts", {
        description: "An unexpected error occurred"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <NewContactSheet
            open={isNewContactSheetOpen}
            onOpenChange={setIsNewContactSheetOpen}
          >
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="">
                <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1} />
              </Button>
            </SheetTrigger>
          </NewContactSheet>
          
          {selectedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/30"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedCount} contact{selectedCount > 1 ? 's' : ''}
            </Button>
          )}
          
          <DataTableToolbarFilter table={table} />
          <DataTableToolbarSort table={table} />
          <DataTableToolbarGroup table={table} />
          {hasActiveModifiers && (
            <Button
              variant="ghost"
              onClick={() => {
                table.resetColumnFilters()
                table.resetSorting()
                table.setGrouping([])
              }}
              className="h-8 px-2 lg:px-3"
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
        <DataTableViewOptions table={table} />
      </div>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} contact{selectedCount > 1 ? 's' : ''}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedCount} Contact${selectedCount > 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}