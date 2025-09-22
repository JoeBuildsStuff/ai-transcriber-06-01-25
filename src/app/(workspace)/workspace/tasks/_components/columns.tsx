"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { ArrowUpRight, Calendar, CheckCircle2, Flag, User, Users, Tags as TagsIcon } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TaskPriority,
  TaskStatus,
  TaskWithAssociations,
} from "../_lib/validations"
import { cn } from "@/lib/utils"

const statusStyles: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  blocked: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  cancelled: "bg-slate-500/10 text-slate-500 dark:text-slate-300",
}

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  urgent: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
}

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function formatDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export const columns: ColumnDef<TaskWithAssociations>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: {
      excludeFromForm: true,
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Title"
        icon={<CheckCircle2 className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const title = row.original.title || "Untitled Task"
      const taskId = row.original.id

      return (
        <div className="flex items-center gap-2">
          <Link
            href={`/workspace/tasks/${taskId}`}
            className="hover:underline cursor-pointer"
          >
            <span className="flex items-center gap-1">
              {title}
              <ArrowUpRight className="size-4" strokeWidth={1.5} />
            </span>
          </Link>
        </div>
      )
    },
    meta: {
      label: "Title",
      variant: "text",
      placeholder: "Task title...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Status"
        icon={<Flag className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const status = row.original.status
      if (!status) return <div className="text-muted-foreground">—</div>

      return (
        <Badge className={cn("uppercase text-xs tracking-wide", statusStyles[status] || "")}>{formatEnumLabel(status)}</Badge>
      )
    },
    meta: {
      label: "Status",
      variant: "select",
      options: TASK_STATUS_OPTIONS.map((status) => ({
        label: formatEnumLabel(status),
        value: status,
      })),
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Priority"
        icon={<Flag className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const priority = row.original.priority
      if (!priority) return <div className="text-muted-foreground">—</div>

      return (
        <Badge className={cn("uppercase text-xs tracking-wide", priorityStyles[priority] || "")}>{formatEnumLabel(priority)}</Badge>
      )
    },
    meta: {
      label: "Priority",
      variant: "select",
      options: TASK_PRIORITY_OPTIONS.map((priority) => ({
        label: formatEnumLabel(priority),
        value: priority,
      })),
    },
    enableColumnFilter: true,
  },
  {
    id: "owner",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Owner"
        icon={<User className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const owner = row.original.owner

      if (!owner) {
        return <div className="text-muted-foreground">Unassigned</div>
      }

      const name = `${owner.first_name || ""} ${owner.last_name || ""}`.trim() || "Unknown Contact"

      return (
        <Badge
          variant="outline"
          className="text-sm font-normal"
          href={`/workspace/contacts/${owner.id}`}
        >
          {name}
        </Badge>
      )
    },
    meta: {
      label: "Owner",
      variant: "text",
      placeholder: "Owner name...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "due_at",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Due"
        icon={<Calendar className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const dueDate = row.original.due_at
      if (!dueDate) return <div className="text-muted-foreground">—</div>

      const formatted = formatDate(dueDate)
      if (!formatted) return <div className="text-muted-foreground">—</div>

      const isOverdue = new Date(dueDate).getTime() < Date.now()

      return (
        <div className={cn("text-sm", isOverdue && "text-rose-600 dark:text-rose-400")}>{formatted}</div>
      )
    },
    meta: {
      label: "Due",
      variant: "date",
    },
    enableColumnFilter: true,
  },
  {
    id: "contacts",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Contacts"
        icon={<Users className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const contacts = row.original.contacts || []

      if (contacts.length === 0) return <div className="text-muted-foreground">—</div>

      if (contacts.length === 1) {
        const contact = contacts[0]
        const name = `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown Contact"
        return (
          <Badge
            variant="blue"
            className="text-sm font-normal"
            href={`/workspace/contacts/${contact.id}`}
          >
            {name}
          </Badge>
        )
      }

      return (
        <div className="flex items-center gap-2">
          <Badge
            variant="blue"
            className="text-sm font-normal"
            href={`/workspace/contacts/${contacts[0].id}`}
          >
            {`${contacts[0].first_name || ""} ${contacts[0].last_name || ""}`.trim() || "Unknown Contact"}
          </Badge>
          <Popover>
            <PopoverTrigger>
              <Badge variant="blue" className="text-xs font-normal cursor-pointer">
                +{contacts.length - 1}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-2 rounded-xl">
              <div className="flex flex-col gap-2">
                {contacts.slice(1).map((contact, index) => {
                  const name = `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unknown Contact"
                  return (
                    <Badge
                      key={`${contact.id}-${index}`}
                      variant="blue"
                      className="text-sm font-normal"
                      href={`/workspace/contacts/${contact.id}`}
                    >
                      {name}
                    </Badge>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )
    },
    meta: {
      label: "Contacts",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    id: "meetings",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Meetings"
        icon={<Calendar className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const meetings = row.original.meetings || []

      if (meetings.length === 0) return <div className="text-muted-foreground">—</div>

      if (meetings.length === 1) {
        const meeting = meetings[0]
        return (
          <Badge
            variant="green"
            className="text-sm font-normal"
            href={`/workspace/meetings/${meeting.id}`}
          >
            {meeting.title || "Untitled Meeting"}
          </Badge>
        )
      }

      return (
        <div className="flex items-center gap-2">
          <Badge
            variant="green"
            className="text-sm font-normal"
            href={`/workspace/meetings/${meetings[0].id}`}
          >
            {meetings[0].title || "Untitled Meeting"}
          </Badge>
          <Popover>
            <PopoverTrigger>
              <Badge variant="green" className="text-xs font-normal cursor-pointer">
                +{meetings.length - 1}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-2 rounded-xl">
              <div className="flex flex-col gap-2">
                {meetings.slice(1).map((meeting, index) => (
                  <Badge
                    key={`${meeting.id}-${index}`}
                    variant="green"
                    className="text-sm font-normal"
                    href={`/workspace/meetings/${meeting.id}`}
                  >
                    {meeting.title || "Untitled Meeting"}
                  </Badge>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )
    },
    meta: {
      label: "Meetings",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    id: "tags",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Tags"
        icon={<TagsIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const tags = row.original.tags || []

      if (tags.length === 0) return <div className="text-muted-foreground">—</div>

      const renderTag = (tag: { id: string; name: string }) => (
        <Badge key={tag.id} variant="outline" className="text-xs font-normal">
          {tag.name}
        </Badge>
      )

      if (tags.length <= 2) {
        return <div className="flex flex-wrap gap-1">{tags.map(renderTag)}</div>
      }

      return (
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map(renderTag)}
          </div>
          <Popover>
            <PopoverTrigger>
              <Badge variant="outline" className="text-xs font-normal cursor-pointer">
                +{tags.length - 2}
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-2 rounded-xl">
              <div className="flex flex-col gap-2">
                {tags.slice(2).map((tag, index) => (
                  <Badge key={`${tag.id}-${index}`} variant="outline" className="text-xs font-normal">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )
    },
    meta: {
      label: "Tags",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Created"
        icon={<Calendar className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string
      const formatted = formatDate(createdAt)
      if (!formatted) return <div className="text-muted-foreground">—</div>

      return <div className="text-sm text-muted-foreground">{formatted}</div>
    },
    meta: {
      label: "Created",
      variant: "date",
      readOnly: true,
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Updated"
        icon={<Calendar className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const updatedAt = row.getValue("updated_at") as string
      const formatted = formatDate(updatedAt)
      if (!formatted) return <div className="text-muted-foreground">—</div>

      return <div className="text-sm text-muted-foreground">{formatted}</div>
    },
    meta: {
      label: "Updated",
      variant: "date",
      readOnly: true,
    },
    enableColumnFilter: true,
  },
]
