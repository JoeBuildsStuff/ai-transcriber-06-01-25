"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"

import { Contact } from "../data/schema"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"
import { Heart } from "lucide-react"
import { format } from "date-fns"
import { CopyableCell } from "./copyable-cell"

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
        className="translate-y-[2px] mr-2"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px] mr-2"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    size: defaultSizeTiny,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("id")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "is_favorite",
    size: defaultSizeSmall,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Favorite" />
    ),
    cell: ({ row }) => (
      <div className="w-fit">
        {row.getValue("is_favorite") ? (
          <Heart className="h-4 w-4 fill-red-150 text-red-700 dark:text-red-400 dark:fill-red-900/30" strokeWidth={1} />
        ) : (
          <Heart className="h-4 w-4 fill-gray-50 text-gray-600 dark:text-gray-400 dark:fill-gray-900/30" />
        )}
      </div>
    ),
    enableGrouping: true,
  },
  {
    accessorKey: "first_name",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="First Name" />
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("first_name")}</div>,
  },
  {
    accessorKey: "last_name",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Name" />
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("last_name")}</div>,
  },
  {
    accessorKey: "display_name",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Display Name" />
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("display_name")}</div>,
  },
  {
    accessorKey: "primary_email",
    size: defaultSizeXLarge,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => <CopyableCell value={row.getValue("primary_email")} />,
  },
  {
    accessorKey: "primary_phone",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => {
      const phone = row.getValue("primary_phone") as string;
      // Format phone number as (XXX) XXX-XXXX
      const formattedPhone = phone?.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
      return <div className="w-fit">{formattedPhone || ""}</div>;
    },
  },
  {
    accessorKey: "company",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("company")}</div>,
    enableGrouping: true,
  },
  {
    accessorKey: "job_title",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Job Title" />
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("job_title")}</div>,
    enableGrouping: true,
  },
  {
    accessorKey: "tags",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tags" />
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
        <DataTableColumnHeader column={column} title="Nickname" />
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("nickname")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "birthday",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Birthday" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("birthday") as string;
      return <div className="w-fit">{date ? format(new Date(date), "MMM d, yyyy") : ""}</div>;
    },
    enableHiding: true,
  },
  {
    accessorKey: "notes",
    size: defaultSizeXLarge,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Notes" />
    ),
    cell: ({ row }) => <div className="w-fit">{row.getValue("notes")}</div>,
    enableHiding: true,
  },
  {
    accessorKey: "created_at",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      return <div className="w-fit">{date ? format(new Date(date), "MMM d, yyyy") : ""}</div>;
    },
    enableHiding: true,
  },
  {
    accessorKey: "updated_at",
    size: defaultSizeMedium,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Updated At" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("updated_at") as string;
      return <div className="w-fit">{date ? format(new Date(date), "MMM d, yyyy") : ""}</div>;
    },
    enableHiding: true,
  },
  {
    accessorKey: "user_id",
    size: defaultSizeXLarge,
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User ID" />
    ),
    cell: ({ row }) => <CopyableCell value={row.getValue("user_id")} />,
    enableHiding: true,
  },
  {
    id: "actions",
    size: defaultSizeSmall,
    cell: ({ row }) => <DataTableRowActions row={row} />,
    enableHiding: true,
  },
]
