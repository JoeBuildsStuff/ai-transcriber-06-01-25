"use client"

import { Row } from "@tanstack/react-table"
import { Copy, ExternalLink, MoreHorizontal, PencilRuler, Star, Trash2} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { deleteContact, duplicateContact } from "@/actions/contacts"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const router = useRouter()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  
  const contactId = row.getValue('id') as string
  const firstName = row.getValue('first_name') as string
  const lastName = row.getValue('last_name') as string
  const displayName = `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown Contact'

  const handleDuplicate = async () => {
  setIsDuplicating(true)
  try {
    const result = await duplicateContact(contactId)
    
    if (result?.error) {
      toast.error("Failed to duplicate contact", {
        description: result.error
      })
    } else {
      toast.success("Contact duplicated successfully", {
        description: "The new contact has been created"
      })
    }
  } catch (error) {
    console.error('Error duplicating contact', error)
    toast.error("Failed to duplicate contact", {
      description: "An unexpected error occurred"
    })
  } finally {
    setIsDuplicating(false)
  }
}


  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteContact(contactId)
      
      if (result?.error) {
        toast.error("Failed to delete contact", {
          description: result.error
        })
      } else {
        toast.success("Contact deleted successfully")
        setIsDeleteDialogOpen(false)
      }
    } catch (error) {
      console.error('Error deleting contact', error)
      toast.error("Failed to delete contact", {
        description: "An unexpected error occurred"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="flex justify-end items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0"
          onClick={() => router.push(`/workspace/contacts/${contactId}`)}
        >
          <ExternalLink size={16}/>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            >
              <MoreHorizontal />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel className="">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <PencilRuler className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDuplicate}
              disabled={isDuplicating}
            >
              <Copy className="mr-2 h-4 w-4" />
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="mr-2 h-4 w-4" />
              Favorite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive hover:!text-destructive focus:!text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4 text-destructive hover:!text-destructive focus:!text-destructive" />
              Delete
              <DropdownMenuShortcut className="text-destructive hover:!text-destructive focus:!text-destructive">⌘⌫</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contact &quot;{displayName}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Contact'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}