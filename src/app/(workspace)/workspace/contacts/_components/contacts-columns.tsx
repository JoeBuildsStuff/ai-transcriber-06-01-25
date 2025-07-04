"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { ContactWithRelations } from "../_lib/validations"
import { AtSign, BriefcaseBusiness, Building2, IdCard, MapPin, Phone, Pilcrow } from "lucide-react"

export const columns: ColumnDef<ContactWithRelations>[] = [
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
    id: "display_name",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <IdCard className="size-4 shrink-0" strokeWidth={1.5} />
        <DataTableColumnHeader column={column} title="Name" />
      </div>
    ),
    cell: ({ row }) => {
      const firstName = row.original.first_name || ""
      const lastName = row.original.last_name || ""
      const displayName = `${firstName} ${lastName}`.trim() || "—"

      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{displayName}</span>
        </div>
      )
    },
    meta: {
      label: "Name",
      variant: "text",
      placeholder: "Display Name...",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "first_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="First Name" />,
    cell: ({ row }) => {
      const firstName = row.getValue("first_name") as string
      return <div className="">{firstName || "—"}</div>
    },
    meta: {
      label: "First Name",
      variant: "text",
      placeholder: "John",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "last_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Name" />,
    cell: ({ row }) => {
      const lastName = row.getValue("last_name") as string
      return <div className="">{lastName || "—"}</div>
    },
    meta: {
      label: "Last Name",
      variant: "text",
      placeholder: "Doe",
    },
    enableColumnFilter: true,
  },
  {
    id: "primary_email",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <AtSign className="size-4 shrink-0" strokeWidth={1.5} />
        <DataTableColumnHeader column={column} title="Email" />
      </div>
    ),
    cell: ({ row }) => {
      const emails = row.original.emails || []
      const primaryEmail = emails.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]
      
      if (!primaryEmail) return <div className="text-muted-foreground">—</div>
      
      return (
        <div className="flex items-center gap-2">
          <Badge variant="blue" className="text-sm font-normal">{primaryEmail.email}</Badge>
          {emails.length > 1 && (
            <Badge variant="gray" className="text-xs font-normal">
              +{emails.length - 1}
            </Badge>
          )}
        </div>
      )
    },
    meta: {
      label: "Email",
      variant: "text",
      placeholder: "john@example.com",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <Pilcrow className="size-4 shrink-0" strokeWidth={1.5} />
        <DataTableColumnHeader column={column} title="Description" />
      </div>
    ),
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      if (!description) return <div className="text-muted-foreground">—</div>
      
      // Truncate description for display
      const truncated = description.length > 50 ? description.substring(0, 50) + "..." : description
      
      return (
        <div className="text-sm text-muted-foreground max-w-[200px] truncate" title={description}>
          {truncated}
        </div>
      )
    },
    meta: {
      label: "Description",
      variant: "text",
      placeholder: "Additional notes about this contact...",
    },
    enableColumnFilter: true,
  },
  {
    id: "company_name",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <Building2 className="size-4 shrink-0" strokeWidth={1.5} />
        <DataTableColumnHeader column={column} title="Company" />
      </div>
    ),
    cell: ({ row }) => {
      const company = row.original.company
      if (!company) return <div className="text-muted-foreground">—</div>
      return <Badge variant="outline" className="text-sm font-normal">{company.name}</Badge>
    },
    meta: {
      label: "Company",
      variant: "text",
      placeholder: "Company ABC",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "job_title",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <BriefcaseBusiness className="size-4 shrink-0" strokeWidth={1.5} />
        <DataTableColumnHeader column={column} title="Title" />
      </div>
    ),
    cell: ({ row }) => {
      const jobTitle = row.getValue("job_title") as string
      return <div className="text-sm">{jobTitle || "—"}</div>
    },
    meta: {
      label: "Job Title",
      variant: "text",
      placeholder: "Software Engineer",
    },
    enableColumnFilter: true,
  },
  {
    id: "primary_phone",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <Phone className="size-4 shrink-0" strokeWidth={1.5} />
        <DataTableColumnHeader column={column} title="Phone" />
      </div>
    ),
    cell: ({ row }) => {
      const phones = row.original.phones || []
      const primaryPhone = phones.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]
      
      if (!primaryPhone) return <div className="text-muted-foreground">—</div>
      
      return (
        <div className="flex items-center gap-2">
          <Badge variant="blue" className="text-sm font-normal">{primaryPhone.phone}</Badge>
          {phones.length > 1 && (
            <Badge variant="gray" className="text-xs font-normal">
              +{phones.length - 1}
            </Badge>
          )}
        </div>
      )
    },
    meta: {
      label: "Phone",
      variant: "text",
      placeholder: "(123) 456-7890",
    },
    enableColumnFilter: true,
  },
  {
    id: "location",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <MapPin className="size-4 shrink-0" strokeWidth={1.5} />
        <DataTableColumnHeader column={column} title="Location" />
      </div>
    ),
    cell: ({ row }) => {
      const city = row.original.city || ""
      const state = row.original.state || ""
      const location = `${city}${city && state ? ', ' : ''}${state}`.trim()
      
      if (!location) return <div className="text-muted-foreground">—</div>
      
      return <div className="text-sm text-muted-foreground">{location}</div>
    },
    meta: {
      label: "Location",
      variant: "text",
      placeholder: "San Francisco, CA",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "linkedin",
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <div className="border border-muted-foreground rounded size-4 flex items-center justify-center">
          <span className="text-xs">in</span>
        </div>
        <DataTableColumnHeader column={column} title="LinkedIn" />
      </div>
    ),
    cell: ({ row }) => {
      const linkedin = row.getValue("linkedin") as string
      if (!linkedin) return <div className="text-muted-foreground">—</div>
      
      // Extract username from LinkedIn URL
      const match = linkedin.match(/linkedin\.com\/in\/([^\/\?]+)/)
      if (match) {
        return <Badge variant="blue" className="text-sm font-normal">@{match[1]}</Badge>
      }
      
      return (
        <a 
          href={linkedin} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          {linkedin}
        </a>
      )
    },
    meta: {
      label: "LinkedIn",
      variant: "text",
      placeholder: "https://www.linkedin.com/in/username",
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