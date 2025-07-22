"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { NoteWithAssociations } from "../_lib/validations"
import { ArrowUpRight, FileText, Workflow, Users, Calendar, Type } from "lucide-react"
import Link from "next/link"

export const columns: ColumnDef<NoteWithAssociations>[] = [
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
    id: "title",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Title" 
        icon={<Type className="size-4 shrink-0" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const title = row.original.title || ""
      const noteId = row.original.id

      return (
        <div className="flex items-center gap-2">
          <Link 
            href={`/workspace/notes/${noteId}`}
            className="hover:underline cursor-pointer"
          >
            <span className="flex items-center gap-1">
              {title || "Untitled Note"} <ArrowUpRight className="size-4" strokeWidth={1.5} />
            </span>
          </Link>
        </div>
      )
    },
    meta: {
      label: "Title",
      variant: "text",
      placeholder: "Note title...",
    },
    enableColumnFilter: true,
  },
  {
    id: "content",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Content" 
        icon={<FileText className="size-4 shrink-0" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const content = row.original.content || ""
      const truncated = content.length > 100 ? content.substring(0, 100) + "..." : content

      return (
        <div className="text-sm text-muted-foreground max-w-[300px] truncate" title={content}>
          {truncated || "No content"}
        </div>
      )
    },
    meta: {
      label: "Content",
      variant: "text",
      placeholder: "Note content...",
    },
    enableColumnFilter: true,
  },
  {
    id: "contacts",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Contacts" 
        icon={<Users className="size-4 shrink-0" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const contacts = row.original.contacts || []
      
      if (contacts.length === 0) return <div className="text-muted-foreground">—</div>
      
      if (contacts.length === 1) {
        const contact = contacts[0]
        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact'
        return <Badge variant="blue" className="text-sm font-normal">{name}</Badge>
      }
      
      return (
        <div className="flex items-center gap-2">
          <Badge variant="blue" className="text-sm font-normal">
            {contacts[0].first_name || ''} {contacts[0].last_name || ''}
          </Badge>
          <Badge variant="gray" className="text-xs font-normal">
            +{contacts.length - 1}
          </Badge>
        </div>
      )
    },
    meta: {
      label: "Contacts",
      variant: "text",
      placeholder: "Associated contacts...",
    },
    enableColumnFilter: true,
  },
  {
    id: "meetings",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Meetings" 
        icon={<Calendar className="size-4 shrink-0" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const meetings = row.original.meetings || []
      
      if (meetings.length === 0) return <div className="text-muted-foreground">—</div>
      
      if (meetings.length === 1) {
        const meeting = meetings[0]
        const title = meeting.title || 'Untitled Meeting'
        return <Badge variant="green" className="text-sm font-normal">{title}</Badge>
      }
      
      return (
        <div className="flex items-center gap-2">
          <Badge variant="green" className="text-sm font-normal">
            {meetings[0].title || 'Untitled Meeting'}
          </Badge>
          <Badge variant="gray" className="text-xs font-normal">
            +{meetings.length - 1}
          </Badge>
        </div>
      )
    },
    meta: {
      label: "Meetings",
      variant: "text",
      placeholder: "Associated meetings...",
    },
    enableColumnFilter: true,
  },
  {
    id: "associations",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Associations" 
        icon={<Workflow className="size-4 shrink-0" strokeWidth={1.5} />}
      />
    ),
    cell: ({ row }) => {
      const contacts = row.original.contacts || []
      const meetings = row.original.meetings || []
      const totalAssociations = contacts.length + meetings.length
      
      if (totalAssociations === 0) return <div className="text-muted-foreground">—</div>
      
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm font-normal">
            {totalAssociations} total
          </Badge>
        </div>
      )
    },
    meta: {
      label: "Associations",
      variant: "text",
      placeholder: "Total associations...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      const createdAt = row.getValue("created_at") as string
      if (!createdAt) return <div className="text-muted-foreground">—</div>
      
      const date = new Date(createdAt)
      const formatted = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
      
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => {
      const updatedAt = row.getValue("updated_at") as string
      if (!updatedAt) return <div className="text-muted-foreground">—</div>
      
      const date = new Date(updatedAt)
      const formatted = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
      
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