"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import NoteForm from "./form"
import { NoteWithAssociations, Contact, Meeting } from "../_lib/validations"
import { Button } from "@/components/ui/button"
import { X, Plus, Save } from "lucide-react"
import { toast } from "sonner"
import { getContacts, getMeetings } from "../_lib/actions"
import BulkNoteForm from "./bulk-form"

interface NoteFormData {
  title: string
  content: string
  contactIds: string[]
  meetingIds: string[]
}

// Helper function to transform form data to database format
function transformFormDataToNote(formData: NoteFormData): Partial<NoteWithAssociations> & { contactIds?: string[]; meetingIds?: string[] } {
  const noteData: Partial<NoteWithAssociations> & { contactIds?: string[]; meetingIds?: string[] } = {
    title: formData.title,
    content: formData.content,
    contactIds: formData.contactIds,
    meetingIds: formData.meetingIds,
  }

  return noteData
}

// Helper function to check if an ID is temporary (for future use)
// function isTemporaryId(id: string): boolean {
//   return id.startsWith('temp-');
// }

// Add Form Wrapper
export function NoteAddForm({
  onSuccess,
  onCancel,
  createAction
}: {
  onSuccess?: () => void
  onCancel?: () => void
  createAction?: (data: Partial<NoteWithAssociations>) => Promise<{ success: boolean; error?: string; data?: { id: string } }>
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<NoteFormData | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [tempNoteId] = useState<string>(`temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [realNoteId, setRealNoteId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const [contactsResult, meetingsResult] = await Promise.all([
        getContacts(),
        getMeetings()
      ])
      
      if (contactsResult.error) {
        toast.error("Could not fetch contacts.")
        console.error(contactsResult.error)
      } else if (contactsResult.data) {
        setContacts(contactsResult.data)
      }
      
      if (meetingsResult.error) {
        toast.error("Could not fetch meetings.")
        console.error(meetingsResult.error)
      } else if (meetingsResult.data) {
        setMeetings(meetingsResult.data)
      }
    }
    fetchData()
  }, [])

  const handleFormDataChange = useCallback((data: NoteFormData) => {
    setFormData(data)
  }, [])

  // Function to create the note when user first interacts with title
  const createNoteIfNeeded = useCallback(async (title: string) => {
    if (realNoteId || !createAction) return realNoteId

    try {
      const noteData = {
        title,
        content: formData?.content || "",
        contactIds: formData?.contactIds || [],
        meetingIds: formData?.meetingIds || []
      }
      
      const result = await createAction(noteData)
      
      if (result.success && result.data?.id) {
        setRealNoteId(result.data.id)
        return result.data.id
      } else {
        console.error("Failed to create note:", result.error)
        toast.error("Failed to create note", { description: result.error })
        return null
      }
    } catch (error) {
      console.error("Error creating note:", error)
      toast.error("An unexpected error occurred while creating the note.")
      return null
    }
  }, [realNoteId, createAction, formData])

  // Handle when the note is created via InputSupabase
  const handleNoteCreated = useCallback((noteId: string) => {
    setRealNoteId(noteId)
  }, [])

  const handleSubmit = async () => {
    if (!formData || !createAction) return

    setIsSubmitting(true)
    try {
      // If we haven't created the note yet, create it now
      if (!realNoteId) {
        const noteId = await createNoteIfNeeded(formData.title)
        if (!noteId) {
          setIsSubmitting(false)
          return
        }
      }

      router.refresh()
      onSuccess?.()
    } catch (error) {
      console.error("Error creating note:", error)
      toast.error("An unexpected error occurred while creating the note.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-0 m-0 mx-3">
        <NoteForm
          initialNoteId={realNoteId || tempNoteId}
          onChange={handleFormDataChange}
          availableContacts={contacts}
          availableMeetings={meetings}
          onNoteCreated={handleNoteCreated}
        />
      </div>
      
      <div className="flex justify-between gap-2 p-4 border-t bg-background">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-1/2"
        >
          <X className="size-4 shrink-0" /> Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData}
          className="w-1/2"
        >
          <Plus className="size-4 shrink-0" />
          {isSubmitting ? "Adding..." : "Add Note"}
        </Button>
      </div>
    </div>
  )
}

// Edit Form Wrapper
export function NoteEditForm({
  data,
  onSuccess,
  onCancel,
  updateAction
}: {
  data: NoteWithAssociations
  onSuccess?: () => void
  onCancel?: () => void
  updateAction?: (id: string, data: Partial<NoteWithAssociations>) => Promise<{ success: boolean; error?: string }>
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<NoteFormData | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])

  useEffect(() => {
    async function fetchData() {
      const [contactsResult, meetingsResult] = await Promise.all([
        getContacts(),
        getMeetings()
      ])
      
      if (contactsResult.error) {
        toast.error("Could not fetch contacts.")
        console.error(contactsResult.error)
      } else if (contactsResult.data) {
        setContacts(contactsResult.data)
      }
      
      if (meetingsResult.error) {
        toast.error("Could not fetch meetings.")
        console.error(meetingsResult.error)
      } else if (meetingsResult.data) {
        setMeetings(meetingsResult.data)
      }
    }
    fetchData()
  }, [])

  // Extract initial values from the note data
  const initialContactIds = data.contacts?.map(c => c.id) || []
  const initialMeetingIds = data.meetings?.map(m => m.id) || []

  const handleFormDataChange = useCallback((formData: NoteFormData) => {
    setFormData(formData)
  }, [])

  const handleSubmit = async () => {
    if (!formData || !updateAction) return

    setIsSubmitting(true)
    try {
      const noteData = transformFormDataToNote(formData) // No initialNoteId for update
      const result = await updateAction(data.id, noteData)
      
      if (result.success) {
        router.refresh()
        onSuccess?.()
      } else {
        console.error("Failed to update note:", result.error)
        toast.error("Failed to update note", { description: result.error })
      }
    } catch (error) {
      console.error("Error updating note:", error)
      toast.error("An unexpected error occurred while updating the note.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <NoteForm
          initialNoteId={data.id}
          initialTitle={data.title || ""}
          initialContent={data.content || ""}
          initialContactIds={initialContactIds}
          initialMeetingIds={initialMeetingIds}
          onChange={handleFormDataChange}
          availableContacts={contacts}
          availableMeetings={meetings}
        />
      </div>
      
      <div className="flex justify-between gap-2 p-4 border-t bg-background">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-1/2"
        >
          <X className="size-4 shrink-0" /> Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData}
          className="w-1/2"
        >
          <Save className="size-4 shrink-0" />
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}

// multi Edit Form Wrapper
export function NoteMultiEditForm({
  selectedCount,
  selectedNoteIds,
  onSuccess,
  onCancel,
  updateActionMulti
}: {
  selectedCount: number
  selectedNoteIds?: string[]
  onSuccess?: () => void
  onCancel?: () => void
  updateActionMulti?: (ids: string[], data: Partial<NoteWithAssociations>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])

  useEffect(() => {
    async function fetchData() {
      const [contactsResult, meetingsResult] = await Promise.all([
        getContacts(),
        getMeetings()
      ])
      
      if (contactsResult.error) {
        toast.error("Could not fetch contacts.")
        console.error(contactsResult.error)
      } else if (contactsResult.data) {
        setContacts(contactsResult.data)
      }
      
      if (meetingsResult.error) {
        toast.error("Could not fetch meetings.")
        console.error(meetingsResult.error)
      } else if (meetingsResult.data) {
        setMeetings(meetingsResult.data)
      }
    }
    fetchData()
  }, [])

  // If we have selectedNoteIds and updateActionMulti, we can use auto-saving bulk components
  const useAutoSave = selectedNoteIds && selectedNoteIds.length > 0 && !!updateActionMulti

  const handleSuccess = () => {
    router.refresh()
    onSuccess?.()
    toast.success("Notes updated successfully", {
      description: `${selectedCount} note${selectedCount > 1 ? 's' : ''} updated.`
    })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <BulkNoteForm
          noteIds={selectedNoteIds || []}
          availableContacts={contacts}
          availableMeetings={meetings}
          updateActionMulti={updateActionMulti}
          useAutoSave={useAutoSave}
          onSuccess={handleSuccess}
        />
      </div>
      
      {!useAutoSave && (
        <div className="flex justify-between gap-2 p-4 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-1/2"
          >
            <X className="size-4 shrink-0" /> Cancel
          </Button>
          <Button
            onClick={() => {
              // Manual save logic would go here if needed
              // But we're moving to auto-save, so this might be removed
            }}
            className="w-1/2"
          >
            <Save className="size-4 shrink-0" />
            Update {selectedCount} Note{selectedCount > 1 ? 's' : ''}
          </Button>
        </div>
      )}
      
      {useAutoSave && (
        <div className="flex justify-center p-4 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-1/2"
          >
            <X className="size-4 shrink-0" /> Done
          </Button>
        </div>
      )}
    </div>
  )
}