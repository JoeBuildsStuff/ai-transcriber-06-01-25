"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Star } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Contacts } from "../_lib/validations"

export const columns: ColumnDef<Contacts>[] = [
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
  },
  {
    accessorKey: "display_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => {
      const displayName = row.getValue("display_name") as string

      return (
        <div className="flex items-center gap-2">
            <span className="font-medium">{displayName}</span>
        </div>
      )
    },
    meta: {
      label: "Name",
      variant: "text",
      placeholder: "Search names...",
      readOnly: true,
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="First Name" />,
    cell: ({ row }) => {
      const firstName = row.getValue("first_name") as string
      return <div className="">{firstName}</div>
    },
    meta: {
      label: "First Name",
      variant: "text",
      placeholder: "Search first names...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "last_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Name" />,
    cell: ({ row }) => {
      const lastName = row.getValue("last_name") as string
      return <div className="">{lastName}</div>
    },
    meta: {
      label: "Last Name",
      variant: "text",
      placeholder: "Search last names...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "nickname",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nickname" />,
    cell: ({ row }) => {
      const nickname = row.getValue("nickname") as string
      if (!nickname) return <div className="text-muted-foreground">—</div>
      return <div className="text-sm">{nickname}</div>
    },
    meta: {
      label: "Nickname",
      variant: "text",
      placeholder: "Search nicknames...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "primary_email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => {
      const email = row.getValue("primary_email") as string
      return <div className="text-muted-foreground">{email}</div>
    },
    meta: {
      label: "Email",
      variant: "text",
      placeholder: "Search emails...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "primary_phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
    cell: ({ row }) => {
      const phone = row.getValue("primary_phone") as string
      if (!phone) return <div className="text-muted-foreground">—</div>
      
      // Format phone number as (XXX) XXX-XXXX
      const formatted = phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
      
      return <div className="text-muted-foreground">{formatted}</div>
    },
    meta: {
      label: "Phone",
      variant: "text",
      placeholder: "Search phone numbers...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "company",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
    cell: ({ row }) => {
      const company = row.getValue("company") as string
      return <div className="">{company}</div>
    },
    meta: {
      label: "Company",
      variant: "text",
      placeholder: "Search companies...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "job_title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Job Title" />,
    cell: ({ row }) => {
      const jobTitle = row.getValue("job_title") as string
      return <div className="text-sm">{jobTitle}</div>
    },
    meta: {
      label: "Job Title",
      variant: "text",
      placeholder: "Search job titles...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "birthday",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Birthday" />,
    cell: ({ row }) => {
      const birthday = row.getValue("birthday") as string
      if (!birthday) return <div className="text-muted-foreground">—</div>
      
      const date = new Date(birthday)
      const formatted = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date)
      
      return <div className="text-sm">{formatted}</div>
    },
    meta: {
      label: "Birthday",
      variant: "date",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "notes",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Notes" />,
    cell: ({ row }) => {
      const notes = row.getValue("notes") as string
      if (!notes) return <div className="text-muted-foreground">—</div>
      
      // Truncate notes if too long
      const truncated = notes.length > 50 ? notes.substring(0, 47) + "..." : notes
      
      return <div className="text-sm max-w-[200px] truncate" title={notes}>{truncated}</div>
    },
    meta: {
      label: "Notes",
      variant: "text",
      placeholder: "Search notes...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "tags",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tags" />,
    cell: ({ row }) => {
      const tags = row.getValue("tags") as string[] | null
      
      if (!tags || tags.length === 0) {
        return <div className="text-muted-foreground">—</div>
      }
      
      return (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )
    },
    meta: {
      label: "Tags",
      variant: "multiSelect",
      options: [
        { label: "Engineering", value: "engineering" },
        { label: "Product", value: "product" },
        { label: "Analytics", value: "analytics" },
        { label: "Operations", value: "ops" },
        { label: "Marketing", value: "marketing" },
        { label: "Investing", value: "investing" },
        { label: "Developer", value: "developer" },
        { label: "AI", value: "ai" },
        { label: "CTO", value: "cto" },
        { label: "Design", value: "design" },
        { label: "Energy", value: "energy" },
        { label: "Sustainability", value: "sustainability" },
        { label: "Automation", value: "automation" },
        { label: "Leadership", value: "leadership" },
        { label: "Business", value: "business" },
        { label: "Founder", value: "founder" },
        { label: "Operations", value: "operations" },
        { label: "Creative", value: "creative" },
        { label: "Compliance", value: "compliance" },
      ],
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "is_favorite",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Favorite" />,
    cell: ({ row }) => {
      const isFavorite = row.getValue("is_favorite") as boolean
      return (
        <div className="flex justify-center">
          {isFavorite ? (
                <Star className="size-5 fill-yellow-400 text-yellow-700 dark:text-yellow-400 dark:fill-yellow-900/30" strokeWidth={1} />
            ) : (
                <Star className="size-5 fill-gray-200 text-gray-400 dark:text-gray-400 dark:fill-gray-900/30" strokeWidth={1} />
            )}
        </div>
      )
    },
    meta: {
      label: "Favorite",
      variant: "boolean",
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
  {
    id: "actions",
    cell: ({ row }) => {
      const contact = row.original
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(contact.id)}
              >
                Copy contact ID
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(contact.primary_email || "")}
              >
                Copy email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit contact</DropdownMenuItem>
              <DropdownMenuItem>View details</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Toggle favorite logic would go here
                  console.log("Toggle favorite for", contact.display_name)
                }}
              >
                {contact.is_favorite ? "Remove from favorites" : "Add to favorites"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
  
]
