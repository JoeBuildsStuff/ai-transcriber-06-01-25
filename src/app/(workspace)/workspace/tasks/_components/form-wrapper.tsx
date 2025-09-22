"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { X, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import TaskForm from "./form"
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TaskContactSummary,
  TaskPriority,
  TaskStatus,
  TaskWithAssociations,
} from "../_lib/validations"
import { getContacts, getMeetings, getTags } from "../_lib/actions"
import type { TaskMeetingSummary, TaskTagSummary } from "../_lib/validations"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TaskActionPayload extends Partial<TaskWithAssociations> {
  contactIds?: string[]
  meetingIds?: string[]
  tagIds?: string[]
}

export function TaskAddForm({
  onSuccess,
  onCancel,
  createAction,
}: {
  onSuccess?: () => void
  onCancel?: () => void
  createAction?: (data: TaskActionPayload) => Promise<{ success: boolean; error?: string; data?: { id: string } }>
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState<TaskContactSummary[]>([])
  const [meetings, setMeetings] = useState<TaskMeetingSummary[]>([])
  const [tags, setTags] = useState<TaskTagSummary[]>([])
  const [tempTaskId] = useState(() => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
  const [realTaskId, setRealTaskId] = useState<string | null>(null)

  // These props are part of the DataTable contract but no longer drive explicit actions.
  void onSuccess
  void onCancel
  void createAction

  useEffect(() => {
    async function fetchData() {
      const [contactsResult, meetingsResult, tagsResult] = await Promise.all([
        getContacts(),
        getMeetings(),
        getTags(),
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

      if (tagsResult.error) {
        toast.error("Could not fetch tags.")
        console.error(tagsResult.error)
      } else if (tagsResult.data) {
        setTags(tagsResult.data)
      }
    }

    fetchData()
  }, [])
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <TaskForm
          initialTaskId={realTaskId ?? tempTaskId}
          initialStatus="todo"
          initialPriority="medium"
          availableContacts={contacts}
          availableMeetings={meetings}
          availableTags={tags}
          onTaskCreated={(newId) => {
            setRealTaskId(newId)
            router.refresh()
            toast.success("Task created successfully")
          }}
        />
      </div>
    </div>
  )
}

export function TaskEditForm({
  data,
  onSuccess,
  onCancel,
  updateAction,
}: {
  data: TaskWithAssociations
  onSuccess?: () => void
  onCancel?: () => void
  updateAction?: (id: string, payload: TaskActionPayload) => Promise<{ success: boolean; error?: string }>
}) {
  const [contacts, setContacts] = useState<TaskContactSummary[]>([])
  const [meetings, setMeetings] = useState<TaskMeetingSummary[]>([])
  const [tags, setTags] = useState<TaskTagSummary[]>([])

  void onSuccess
  void onCancel
  void updateAction

  useEffect(() => {
    async function fetchData() {
      const [contactsResult, meetingsResult, tagsResult] = await Promise.all([
        getContacts(),
        getMeetings(),
        getTags(),
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

      if (tagsResult.error) {
        toast.error("Could not fetch tags.")
        console.error(tagsResult.error)
      } else if (tagsResult.data) {
        setTags(tagsResult.data)
      }
    }

    fetchData()
  }, [])

  const initialContactIds = useMemo(
    () => data.contacts?.map((contact) => contact.id) || [],
    [data.contacts]
  )
  const initialMeetingIds = useMemo(
    () => data.meetings?.map((meeting) => meeting.id) || [],
    [data.meetings]
  )
  const initialTagIds = useMemo(
    () => data.tags?.map((tag) => tag.id) || [],
    [data.tags]
  )

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <TaskForm
          initialTaskId={data.id}
          initialTitle={data.title || ""}
          initialDescription={data.description || ""}
          initialStatus={data.status}
          initialPriority={data.priority}
          initialStartAt={data.start_at}
          initialDueAt={data.due_at}
          initialOwnerContactId={data.owner?.id || data.owner_contact_id || null}
          initialContactIds={initialContactIds}
          initialMeetingIds={initialMeetingIds}
          initialTagIds={initialTagIds}
          availableContacts={contacts}
          availableMeetings={meetings}
          availableTags={tags}
        />
      </div>
    </div>
  )
}

export function TaskMultiEditForm({
  selectedCount,
  selectedNoteIds,
  onSuccess,
  onCancel,
  updateActionMulti,
}: {
  selectedCount: number
  selectedNoteIds?: string[]
  onSuccess?: () => void
  onCancel?: () => void
  updateActionMulti?: (ids: string[], payload: TaskActionPayload) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState<TaskContactSummary[]>([])
  const [status, setStatus] = useState<TaskStatus | undefined>(undefined)
  const [priority, setPriority] = useState<TaskPriority | undefined>(undefined)
  const [ownerContactId, setOwnerContactId] = useState<string | null | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchContacts() {
      const contactsResult = await getContacts()
      if (contactsResult.error) {
        toast.error("Could not fetch contacts.")
        console.error(contactsResult.error)
      } else if (contactsResult.data) {
        setContacts(contactsResult.data)
      }
    }

    fetchContacts()
  }, [])

  const handleSubmit = async () => {
    if (!updateActionMulti || !selectedNoteIds || selectedNoteIds.length === 0) return

    const payload: TaskActionPayload = {}

    if (status !== undefined) {
      payload.status = status
    }

    if (priority !== undefined) {
      payload.priority = priority
    }

    if (ownerContactId !== undefined) {
      payload.owner_contact_id = ownerContactId
    }

    if (Object.keys(payload).length === 0) {
      toast.error("Select at least one field to update")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updateActionMulti(selectedNoteIds, payload)
      if (result.success) {
        toast.success("Tasks updated", {
          description: `${selectedCount} task${selectedCount > 1 ? "s" : ""} updated successfully.`,
        })
        router.refresh()
        onSuccess?.()
      } else {
        toast.error("Failed to update tasks", { description: result.error })
      }
    } catch (error) {
      console.error("Error multi updating tasks:", error)
      toast.error("An unexpected error occurred while updating the tasks.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <LabelWithHelper
            label="Status"
            helperText="Choose a new status or keep the current values"
          />
          <Select value={status ?? ""} onValueChange={(value) => setStatus(value ? (value as TaskStatus) : undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="Keep existing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Keep existing</SelectItem>
              {TASK_STATUS_OPTIONS.map((statusOption) => (
                <SelectItem key={statusOption} value={statusOption}>
                  {statusOption.split("_").map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1)).join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <LabelWithHelper
            label="Priority"
            helperText="Select a new priority level for all selected tasks"
          />
          <Select value={priority ?? ""} onValueChange={(value) => setPriority(value ? (value as TaskPriority) : undefined)}>
            <SelectTrigger>
              <SelectValue placeholder="Keep existing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Keep existing</SelectItem>
              {TASK_PRIORITY_OPTIONS.map((priorityOption) => (
                <SelectItem key={priorityOption} value={priorityOption}>
                  {priorityOption.split("_").map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1)).join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <LabelWithHelper
            label="Owner"
            helperText="Assign a new owner or clear existing assignments"
          />
          <Select
            value={ownerContactId === undefined ? "" : ownerContactId ?? "__unassigned__"}
            onValueChange={(value) => {
              if (value === "") {
                setOwnerContactId(undefined)
              } else if (value === "__unassigned__") {
                setOwnerContactId(null)
              } else {
                setOwnerContactId(value)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Keep existing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Keep existing</SelectItem>
              <SelectItem value="__unassigned__">Clear owner</SelectItem>
              {contacts.map((contact) => {
                const displayName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown Contact"
                return (
                  <SelectItem key={contact.id} value={contact.id}>
                    {displayName}
                    {contact.company_name ? ` (${contact.company_name})` : ""}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between gap-2 p-4 border-t bg-background">
        <Button type="button" variant="outline" onClick={onCancel} className="w-1/2">
          <X className="size-4 shrink-0" /> Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-1/2">
          <Save className="size-4 shrink-0" />
          {isSubmitting ? "Updating..." : `Update ${selectedCount} Task${selectedCount > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  )
}

function LabelWithHelper({
  label,
  helperText,
}: {
  label: string
  helperText?: string
}) {
  return (
    <div>
      <p className="text-sm font-medium leading-none text-foreground">{label}</p>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  )
}
