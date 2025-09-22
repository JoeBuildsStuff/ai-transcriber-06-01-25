"use client"

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react"

import InputSupabase from "@/components/supabase/_components/input-supabase"
import SelectSupabase from "@/components/supabase/_components/select-supabase"
import ComboboxSupabase from "@/components/supabase/_components/combobox-supabase"
import { DateFieldSupabase, DateInputSupabase } from "@/components/supabase/_components/datefield-rac-supabase"
import { useSupabaseInput } from "@/components/supabase/_hooks/use-supabase-input"
import { DeleteButton } from "@/components/ui/delete-button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TaskContactSummary,
  TaskFormData,
  TaskMeetingSummary,
  TaskPriority,
  TaskStatus,
  TaskTagSummary,
} from "../_lib/validations"
import { deleteTasks } from "../_lib/actions"
import {
  Calendar,
  CalendarClock,
  FileText,
  Flag,
  ListChecks,
  Tag as TagIcon,
  Type,
  Users,
  UserCircle,
} from "lucide-react"

interface TaskFormProps {
  initialTaskId?: string
  initialTitle?: string
  initialDescription?: string | null
  initialStatus?: TaskStatus
  initialPriority?: TaskPriority
  initialStartAt?: string | null
  initialDueAt?: string | null
  initialOwnerContactId?: string | null
  initialContactIds?: string[]
  initialMeetingIds?: string[]
  initialTagIds?: string[]
  availableContacts?: TaskContactSummary[]
  availableMeetings?: TaskMeetingSummary[]
  availableTags?: TaskTagSummary[]
  onChange?: (data: TaskFormData) => void
  onTaskCreated?: (taskId: string) => void
  className?: string
}

const UNASSIGNED_OWNER_VALUE = "__unassigned__"

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

interface FieldRowProps {
  icon: ReactNode
  label: string
  children: ReactNode
  alignTop?: boolean
}

function FieldRow({ icon, label, children, alignTop = false }: FieldRowProps) {
  return (
    <div className={cn("flex gap-2", alignTop ? "items-start" : "items-center")}>
      <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[6rem] text-muted-foreground">
        {icon}
        <span className="whitespace-nowrap @max-sm:hidden font-light">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export default function TaskForm({
  initialTaskId,
  initialTitle = "",
  initialDescription = "",
  initialStatus = "todo",
  initialPriority = "medium",
  initialStartAt = null,
  initialDueAt = null,
  initialOwnerContactId = null,
  initialContactIds,
  initialMeetingIds,
  initialTagIds,
  availableContacts = [],
  availableMeetings = [],
  availableTags = [],
  onChange,
  onTaskCreated,
  className,
}: TaskFormProps) {
  const tempId = useMemo(
    () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    []
  )

  const [taskId, setTaskId] = useState(initialTaskId ?? tempId)

  useEffect(() => {
    if (initialTaskId) {
      setTaskId(initialTaskId)
    }
  }, [initialTaskId])

  const normalizedInitialContactIds = useMemo(() => initialContactIds ?? [], [initialContactIds])
  const normalizedInitialMeetingIds = useMemo(() => initialMeetingIds ?? [], [initialMeetingIds])
  const normalizedInitialTagIds = useMemo(() => initialTagIds ?? [], [initialTagIds])

  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription ?? "")
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [priority, setPriority] = useState<TaskPriority>(initialPriority)
  const [startAt, setStartAt] = useState<string | null>(initialStartAt)
  const [dueAt, setDueAt] = useState<string | null>(initialDueAt)
  const [ownerContactId, setOwnerContactId] = useState<string | null>(initialOwnerContactId)
  const [contactIds, setContactIds] = useState<string[]>(normalizedInitialContactIds)
  const [meetingIds, setMeetingIds] = useState<string[]>(normalizedInitialMeetingIds)
  const [tagIds, setTagIds] = useState<string[]>(normalizedInitialTagIds)

  useEffect(() => {
    setTitle(initialTitle)
  }, [initialTitle])

  useEffect(() => {
    setDescription(initialDescription ?? "")
  }, [initialDescription])

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  useEffect(() => {
    setPriority(initialPriority)
  }, [initialPriority])

  useEffect(() => {
    setStartAt(initialStartAt)
  }, [initialStartAt])

  useEffect(() => {
    setDueAt(initialDueAt)
  }, [initialDueAt])

  useEffect(() => {
    setOwnerContactId(initialOwnerContactId ?? null)
  }, [initialOwnerContactId])

  useEffect(() => {
    setContactIds(normalizedInitialContactIds)
  }, [normalizedInitialContactIds])

  useEffect(() => {
    setMeetingIds(normalizedInitialMeetingIds)
  }, [normalizedInitialMeetingIds])

  useEffect(() => {
    setTagIds(normalizedInitialTagIds)
  }, [normalizedInitialTagIds])

  const handleTaskCreated = useCallback((createdId: string) => {
    setTaskId(createdId)
    onTaskCreated?.(createdId)
  }, [onTaskCreated])

  const {
    value: descriptionValue,
    handleChange: handleDescriptionChange,
    handleBlur: handleDescriptionBlur,
    updating: descriptionUpdating,
    savedValue: descriptionSavedValue,
  } = useSupabaseInput({
    table: "tasks",
    field: "description",
    id: taskId,
    initialValue: initialDescription ?? "",
    onCreateSuccess: handleTaskCreated,
  })

  const buildTaskDefaults = useCallback(({
  }: { userId: string }) => ({
    title: title || "",
    description: description.trim() ? description.trim() : null,
    status,
    priority,
    start_at: startAt,
    due_at: dueAt,
    owner_contact_id: ownerContactId ?? null,
  }), [title, description, status, priority, startAt, dueAt, ownerContactId])

  useEffect(() => {
    onChange?.({
      title,
      description: description.trim() === "" ? null : description,
      status,
      priority,
      start_at: startAt,
      due_at: dueAt,
      owner_contact_id: ownerContactId ?? null,
      contactIds,
      meetingIds,
      tagIds,
    })
  }, [
    title,
    description,
    status,
    priority,
    startAt,
    dueAt,
    ownerContactId,
    contactIds,
    meetingIds,
    tagIds,
    onChange,
  ])

  const ownerOptions = useMemo(
    () => [
      {
        value: UNASSIGNED_OWNER_VALUE,
        label: "Unassigned",
      },
      ...availableContacts.map((contact) => ({
        value: contact.id,
        label: `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown Contact",
        description: contact.company_name ?? undefined,
      })),
    ],
    [availableContacts],
  )

  const contactOptions = useMemo(
    () =>
      availableContacts.map((contact) => ({
        value: contact.id,
        label: `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown Contact",
        subLabel: contact.company_name ?? null,
      })),
    [availableContacts],
  )

  const meetingOptions = useMemo(
    () =>
      availableMeetings.map((meeting) => ({
        value: meeting.id,
        label: meeting.title || "Untitled Meeting",
        subLabel: meeting.meeting_at ? new Date(meeting.meeting_at).toLocaleDateString() : null,
      })),
    [availableMeetings],
  )

  const tagOptions = useMemo(
    () =>
      availableTags.map((tag) => ({
        value: tag.id,
        label: tag.name,
        subLabel: tag.description ?? undefined,
      })),
    [availableTags],
  )

  const statusOptions = useMemo(
    () =>
      TASK_STATUS_OPTIONS.map((item) => ({
        value: item,
        label: formatEnumLabel(item),
      })),
    []
  )

  const priorityOptions = useMemo(
    () =>
      TASK_PRIORITY_OPTIONS.map((item) => ({
        value: item,
        label: formatEnumLabel(item),
      })),
    []
  )

  const isTemporaryId = taskId.startsWith("temp-")

  return (
    <div className={cn("flex flex-col gap-6 text-foreground w-full pt-1", className)}>
      <div className="flex flex-col gap-4">
        <FieldRow icon={<Type className="size-4 shrink-0" strokeWidth={1.5} />} label="Title">
          <div className="flex items-center gap-2">
            <InputSupabase
              table="tasks"
              field="title"
              id={taskId}
              initialValue={initialTitle}
              placeholder="Add task title..."
              onNoteCreated={handleTaskCreated}
              onValueChange={setTitle}
              className="border-none bg-input/30 shadow-none text-sm font-light"
            />
            {!isTemporaryId && (
              <DeleteButton
                onDelete={async () => {
                  const result = await deleteTasks([taskId])
                  if (!result.success) throw new Error(result.error)
                }}
                redirectTo="/workspace/tasks"
              />
            )}
          </div>
        </FieldRow>

        <FieldRow
          icon={<FileText className="size-4 shrink-0" strokeWidth={1.5} />}
          label="Description"
          alignTop
        >
          <Textarea
            value={descriptionValue}
            onChange={(event) => {
              const nextValue = event.target.value
              handleDescriptionChange(nextValue)
              setDescription(nextValue)
            }}
            onBlur={handleDescriptionBlur}
            disabled={descriptionUpdating}
            placeholder="Add a helpful description..."
            rows={4}
            className={cn(
              "bg-input/30 border-none text-sm font-light",
              descriptionValue !== descriptionSavedValue && "text-blue-700 dark:text-blue-400"
            )}
          />
        </FieldRow>
      </div>

      <div className="flex flex-col gap-3">
        <FieldRow icon={<ListChecks className="size-4 shrink-0" strokeWidth={1.5} />} label="Status">
          <SelectSupabase
            table="tasks"
            field="status"
            id={taskId}
            initialValue={status}
            options={statusOptions}
            placeholder="Select status"
            onNoteCreated={handleTaskCreated}
            onValueChange={(value) => setStatus(value as TaskStatus)}
            parentDefaults={buildTaskDefaults}
            className="text-sm font-light"
            triggerClassName="border-none bg-input/30 shadow-none"
          />
        </FieldRow>

        <FieldRow icon={<Flag className="size-4 shrink-0" strokeWidth={1.5} />} label="Priority">
          <SelectSupabase
            table="tasks"
            field="priority"
            id={taskId}
            initialValue={priority}
            options={priorityOptions}
            placeholder="Select priority"
            onNoteCreated={handleTaskCreated}
            onValueChange={(value) => setPriority(value as TaskPriority)}
            parentDefaults={buildTaskDefaults}
            className="text-sm font-light"
            triggerClassName="border-none bg-input/30 shadow-none"
          />
        </FieldRow>

        <FieldRow icon={<Calendar className="size-4 shrink-0" strokeWidth={1.5} />} label="Start">
          <DateFieldSupabase
            table="tasks"
            field="start_at"
            id={taskId}
            initialValue={initialStartAt}
            onNoteCreated={handleTaskCreated}
            onSuccess={(value) => setStartAt(value)}
            parentDefaults={buildTaskDefaults}
            className="bg-input/30 rounded-md px-2 py-2 text-sm font-light"
          >
            <DateInputSupabase className="bg-transparent outline-none flex-1" />
          </DateFieldSupabase>
        </FieldRow>

        <FieldRow icon={<CalendarClock className="size-4 shrink-0" strokeWidth={1.5} />} label="Due">
          <DateFieldSupabase
            table="tasks"
            field="due_at"
            id={taskId}
            initialValue={initialDueAt}
            onNoteCreated={handleTaskCreated}
            onSuccess={(value) => setDueAt(value)}
            parentDefaults={buildTaskDefaults}
            className="bg-input/30 rounded-md px-2 py-2 text-sm font-light"
          >
            <DateInputSupabase className="bg-transparent outline-none flex-1" />
          </DateFieldSupabase>
        </FieldRow>
      </div>

      <div className="flex flex-col gap-3">
        <FieldRow icon={<UserCircle className="size-4 shrink-0" strokeWidth={1.5} />} label="Owner">
          <SelectSupabase
            table="tasks"
            field="owner_contact_id"
            id={taskId}
            initialValue={ownerContactId ?? UNASSIGNED_OWNER_VALUE}
            options={ownerOptions}
            placeholder="Assign an owner"
            onNoteCreated={handleTaskCreated}
            onValueChange={(value) => setOwnerContactId(value === UNASSIGNED_OWNER_VALUE ? null : value)}
            parentDefaults={buildTaskDefaults}
            transformValue={(value) => (value === UNASSIGNED_OWNER_VALUE ? null : value)}
            className="text-sm font-light"
            triggerClassName="border-none bg-input/30 shadow-none"
          />
        </FieldRow>

        <FieldRow icon={<Users className="size-4 shrink-0" strokeWidth={1.5} />} label="Contacts">
          <ComboboxSupabase
            table="task_contacts"
            field="contact_id"
            id={taskId}
            initialValue={contactIds}
            options={contactOptions}
            placeholder="Associate with contacts..."
            searchPlaceholder="Search contacts..."
            emptyText="No contacts found."
            onNoteCreated={handleTaskCreated}
            onChange={setContactIds}
            noteIdField="task_id"
            targetIdField="contact_id"
            parentTable="tasks"
            parentDefaults={buildTaskDefaults}
            className="bg-input/30 rounded-md py-2 px-2 text-sm font-light"
          />
        </FieldRow>

        <FieldRow icon={<Calendar className="size-4 shrink-0" strokeWidth={1.5} />} label="Meetings">
          <ComboboxSupabase
            table="task_meetings"
            field="meeting_id"
            id={taskId}
            initialValue={meetingIds}
            options={meetingOptions}
            placeholder="Associate with meetings..."
            searchPlaceholder="Search meetings..."
            emptyText="No meetings found."
            onNoteCreated={handleTaskCreated}
            onChange={setMeetingIds}
            noteIdField="task_id"
            targetIdField="meeting_id"
            parentTable="tasks"
            parentDefaults={buildTaskDefaults}
            className="bg-input/30 rounded-md py-2 px-2 text-sm font-light"
          />
        </FieldRow>

        <FieldRow icon={<TagIcon className="size-4 shrink-0" strokeWidth={1.5} />} label="Tags">
          <ComboboxSupabase
            table="task_tags"
            field="tag_id"
            id={taskId}
            initialValue={tagIds}
            options={tagOptions}
            placeholder="Add tags..."
            searchPlaceholder="Search tags..."
            emptyText="No tags found."
            onNoteCreated={handleTaskCreated}
            onChange={setTagIds}
            noteIdField="task_id"
            targetIdField="tag_id"
            parentTable="tasks"
            parentDefaults={buildTaskDefaults}
            className="bg-input/30 rounded-md py-2 px-2 text-sm font-light"
          />
        </FieldRow>
      </div>
    </div>
  )
}
