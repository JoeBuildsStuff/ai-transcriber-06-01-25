import { columns } from "./contacts-columns"
import { DataTable } from "@/components/data-table/data-table"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { getContacts } from "../_lib/queries"
import { deleteContacts, createContact, updateContact } from "../_lib/actions"
import { ContactAddForm, ContactEditForm } from "./contacts-form-wrapper"
import { ColumnDef } from "@tanstack/react-table"

interface DataTableContactsProps {
  searchParams?: SearchParams
}

export default async function DataTableContacts({ 
  searchParams = {} 
}: DataTableContactsProps) {
  const { data, count, error } = await getContacts(searchParams)
  const { pagination } = parseSearchParams(searchParams)

  if (error) {
    // TODO: Add a toast notification
    console.error(error)
  }

  const pageCount = Math.ceil((count ?? 0) / (pagination?.pageSize ?? 10))
  const initialState = {
    ...parseSearchParams(searchParams),
    columnVisibility: {
      first_name: false,
      last_name: false,
    },
  }

  // Cast the data and actions to match DataTable's expected types
  const tableData = data as unknown as Record<string, unknown>[]
  const tableColumns = columns as ColumnDef<Record<string, unknown>, unknown>[]
  
  const tableDeleteAction = deleteContacts as (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  const tableCreateAction = createContact as unknown as (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  const tableUpdateAction = updateContact as unknown as (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  
  // Cast the custom forms to match expected types
  const AddForm = ContactAddForm as React.ComponentType<{
    onSuccess?: () => void
    onCancel?: () => void
    createAction?: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }>
  
  const EditForm = ContactEditForm as React.ComponentType<{
    data: Record<string, unknown>
    onSuccess?: () => void
    onCancel?: () => void
    updateAction?: (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }>

  return (
      <DataTable 
        columns={tableColumns} 
        data={tableData} 
        pageCount={pageCount}
        initialState={initialState}
        deleteAction={tableDeleteAction}
        createAction={tableCreateAction}
        updateAction={tableUpdateAction}
        customAddForm={AddForm}
        customEditForm={EditForm}
      />
  )
}