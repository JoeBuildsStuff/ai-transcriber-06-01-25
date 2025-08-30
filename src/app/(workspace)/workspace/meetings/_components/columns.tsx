"use client"

import { format, formatDistanceToNow } from "date-fns"
import { ArrowUpRight, Calendar, CheckCircle, Circle, Clock4, Timer, Type, Users } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { MeetingsList } from "../../meetings/[id]/_lib/validations"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export const columns: ColumnDef<MeetingsList>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex justify-start items-start w-5">
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-start items-start w-5">
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Title" 
      icon={<Type className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />} />
    ),
    cell: ({ row }) => {
      const title = row.getValue("title") as string
      return (
        <div className="flex items-center gap-2">
        <Link 
          href={`/workspace/meetings/${row.original.id}`}
          className="hover:underline cursor-pointer"
        >
          <span className="flex items-center gap-1">
            {title || "Untitled Meeting"} <ArrowUpRight className="size-4" strokeWidth={1.5} />
          </span>
        </Link>
      </div>
      )
    },
    meta: {
      label: "Title",
      variant: "text",
      placeholder: "New Meeting",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "meeting_at",
    header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Meeting Date" 
      icon={<Calendar className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />} />
    ),
    cell: ({ row }) => {
      const meetingAt = row.getValue("meeting_at") as string
      if (!meetingAt) return <div className="text-muted-foreground">—</div>
      
      const date = new Date(meetingAt)
      const formatted = format(date, 'E, MMM d')
      
      return <div className="text-sm">{formatted}</div>
    },
    meta: {
      label: "Meeting Date",
      variant: "date",
    },
    enableColumnFilter: true,
  },
  {
    id: "meeting_time",
    header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Time" 
      icon={<Clock4 className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />} />
    ),
    cell: ({ row }) => {
      const meetingAt = row.original.meeting_at
      if (!meetingAt) return <div className="text-muted-foreground">—</div>
      
      const date = new Date(meetingAt)
      const formatted = format(date, 'h:mm a')
      
      return <div className="text-sm">{formatted}</div>
    },
    meta: {
      label: "Time",
      readOnly: true,
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    id: "meeting_age",
    header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Age" 
      icon={<Timer className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />} />
    ),
    cell: ({ row }) => {
      const meetingAt = row.original.meeting_at
      if (!meetingAt) return <div className="text-muted-foreground">—</div>
      
      const date = new Date(meetingAt)
      const formatted = formatDistanceToNow(date, { addSuffix: true })
      
      return <div className="text-sm text-muted-foreground">{formatted}</div>
    },
    meta: {
      label: "Age",
      readOnly: true,
      variant: "text",
    },
  },
  {
    accessorKey: "meeting_reviewed",
    header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Reviewed" 
      icon={<CheckCircle className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />} />
    ),
    cell: ({ row }) => {
      const isReviewed = row.getValue("meeting_reviewed") as boolean
      return (
        <div className="flex justify-start items-start">
          {isReviewed ? (
            <CheckCircle className="size-5 border-transparent bg-green-50 text-green-700 dark:text-green-400 dark:bg-green-900/20 " />
          ) : (
            <Circle className="size-5 border-transparent bg-gray-50 text-gray-600 dark:text-gray-400 dark:bg-gray-900/20 " />
          )}
        </div>
      )
    },
    meta: {
      label: "Reviewed",
      variant: "boolean",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "speakers",
    header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Speakers" 
      icon={<Users className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />} />
    ),
    cell: ({ row }) => {
      const speakers = row.getValue("speakers") as Array<{
        id: string
        contact_id: string | null
        first_name: string | null
        last_name: string | null
        speaker_name: string | null
      }> | null

      if (!speakers || speakers.length === 0) {
        return <div className="text-muted-foreground">—</div>
      }

      return (
        <div className="flex flex-wrap gap-3">
          {speakers.map((speaker, index) => {
            // Use contact name if available, otherwise fall back to speaker_name
            const displayName = speaker.first_name && speaker.last_name 
              ? `${speaker.first_name} ${speaker.last_name}`.trim()
              : speaker.speaker_name || "Unknown"
            
            // If speaker has a contact_id, make the badge clickable
            if (speaker.contact_id) {
              return (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs mb-1"
                  href={`/workspace/contacts/${speaker.contact_id}`}
                >
                  {displayName}
                </Badge>
              )
            }
            
            // Otherwise, render as regular badge
            return (
              <Badge key={index} variant="outline" className="text-xs mb-1">
                {displayName}
              </Badge>
            )
          })}
        </div>
      )
    },
    meta: {
      label: "Speakers",
      variant: "text",
      readOnly: true,
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Created" 
      icon={<Calendar className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />} />
    ),
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
    header: ({ column }) => (
    <DataTableColumnHeader 
      column={column} 
      title="Updated" 
      icon={<Calendar className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />} />
    ),
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
