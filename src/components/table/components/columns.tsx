"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"

import { Contact } from "../data/schema"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"
import { GripVertical } from "lucide-react"

//create default size for columns
const defaultSizeTiny = 50
const defaultSizeSmall = 100
const defaultSizeMedium = 150
// const defaultSizeLarge = 200
const defaultSizeXLarge = 350

export const columns: ColumnDef<Contact>[] = [
  {
    id: "select",
    size: defaultSizeTiny,

    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    size: defaultSizeTiny,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
      <DataTableColumnHeader column={column} title="ID" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("id")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "is_favorite",
    size: defaultSizeSmall,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Favorite" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{String(row.getValue("is_favorite"))}</div>,
    enableGrouping: true,
  },
  {
    accessorKey: "first_name",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="First Name" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("first_name")}</div>,
  },
  {
    accessorKey: "last_name",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Last Name" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("last_name")}</div>,
  },
  {
    accessorKey: "display_name",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Display Name" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("display_name")}</div>,
  },
  {
    accessorKey: "primary_email",
    size: defaultSizeXLarge,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Email" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("primary_email")}</div>,
  },
  {
    accessorKey: "primary_phone",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Phone" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("primary_phone")}</div>,
  },
  {
    accessorKey: "company",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Company" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("company")}</div>,
    enableGrouping: true,
  },
  {
    accessorKey: "job_title",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Job Title" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("job_title")}</div>,
    enableGrouping: true,
  },
  {
    accessorKey: "tags",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Tags" />
      </div>
    ),
    cell: ({ row }) => {
      const tags = row.getValue("tags");
      return <div className="w-fit">{Array.isArray(tags) ? tags.join(", ") : ""}</div>
    },
  },
  {
    accessorKey: "nickname",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Nickname" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("nickname")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "birthday",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Birthday" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("birthday")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "notes",
    size: defaultSizeXLarge,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Notes" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("notes")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "created_at",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Created At" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("created_at")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "updated_at",
    size: defaultSizeMedium,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="Updated At" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("updated_at")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "user_id",
    size: defaultSizeXLarge,
    header: ({ column }) => (
      <div className="flex items-center">
        <GripVertical className="w-4 h-4" />
        <DataTableColumnHeader column={column} title="User ID" />
      </div>
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("user_id")}</div>,
    enableHiding: true,
  },
  {
    id: "actions",
    size: defaultSizeSmall,
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
