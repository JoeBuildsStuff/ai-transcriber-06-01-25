"use client"

import { format, formatDistanceToNow } from "date-fns"
import { CheckCircle, Circle } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { MeetingsList } from "../_lib/validations"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<MeetingsList>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex justify-start items-start w-2">
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
      <div className="flex justify-start items-start w-2">
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => {
      const title = row.getValue("title") as string
      return (

          <div className="flex items-center gap-1 justify-start">
            <span className="font-medium">
              {title || "Untitled Meeting"}
            </span>
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Meeting Date" />,
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
    header: "Time",
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
    header: "Age",
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reviewed" />,
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
    accessorKey: "speaker_names",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Speakers" />,
    cell: ({ row }) => {
      const speakerNames = row.getValue(
        "speaker_names"
      ) as { [key: string]: string } | null

      if (!speakerNames || Object.keys(speakerNames).length === 0) {
        return <div className="text-muted-foreground">—</div>
      }

      const names = Object.values(speakerNames).filter(
        (name) => name && name.trim() !== ""
      )

      if (names.length === 0) {
        return <div className="text-muted-foreground">—</div>
      }

      return (
        <div className="flex flex-wrap gap-1">
          {names.map((name, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {name}
            </Badge>
          ))}
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
    accessorKey: "user_notes",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Notes" />,
    cell: ({ row }) => {
      const notes = row.getValue("user_notes") as string | null
      if (!notes) return <div className="text-muted-foreground">—</div>
      
      const truncated = notes.length > 50 ? notes.substring(0, 47) + "..." : notes
      
      return <div className="max-w-[200px] truncate text-sm" title={notes}>{truncated}</div>
    },
    meta: {
      label: "Notes",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "summary",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Summary" />,
    cell: ({ row }) => {
      const summary = row.getValue("summary") as string | null
      if (!summary) return <div className="text-muted-foreground">—</div>
      
      const truncated = summary.length > 50 ? summary.substring(0, 47) + "..." : summary
      
      return <div className="max-w-[200px] truncate text-sm" title={summary}>{truncated}</div>
    },
    meta: {
      label: "Summary",
      variant: "text",
      readOnly: true,
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "original_file_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Original File" />,
    cell: ({ row }) => {
      const fileName = row.getValue("original_file_name") as string | null
      if (!fileName) return <div className="text-muted-foreground">—</div>
      
      const truncated = fileName.length > 30 ? fileName.substring(0, 27) + "..." : fileName
      
      return <div className="text-sm" title={fileName}>{truncated}</div>
    },
    meta: {
      label: "Original File",
      variant: "text",
      readOnly: true,
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
