import { columns } from "./columns"
import { DataTable } from "@/components/data-table/data-table"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { getPersons } from "../_lib/queries"
import { deletePersons, createPerson, updatePerson, multiUpdatePersons } from "../_lib/actions"
import { ContactAddForm, ContactEditForm, ContactMultiEditForm } from "./form-wrapper"
import { ColumnDef } from "@tanstack/react-table"

interface DataTablePersonProps {
  searchParams?: SearchParams
}

export default async function DataTablePerson({ 
  searchParams = {} 
}: DataTablePersonProps) {
  const { data, count, error } = await getPersons(searchParams)
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
  
  const tableDeleteAction = deletePersons as (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  const tableCreateAction = createPerson as unknown as (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  const tableUpdateActionSingle = updatePerson as unknown as (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  const tableUpdateActionMulti = multiUpdatePersons as unknown as (ids: string[], data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  
  // Cast the custom forms to match expected types
  const AddForm = ContactAddForm as React.ComponentType<{
    onSuccess?: () => void
    onCancel?: () => void
    createAction?: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }>
  
  const EditFormSingle = ContactEditForm as React.ComponentType<{
    data: Record<string, unknown>
    onSuccess?: () => void
    onCancel?: () => void
    updateAction?: (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }>

  const EditFormMulti = ContactMultiEditForm as React.ComponentType<{
    selectedCount: number
    onSuccess?: () => void
    onCancel?: () => void
    updateActionMulti?: (ids: string[], data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  }>

  return (
      <DataTable 
        columns={tableColumns} 
        data={tableData} 
        pageCount={pageCount}
        initialState={initialState}
        deleteAction={tableDeleteAction}
        createAction={tableCreateAction}
        updateActionSingle={tableUpdateActionSingle}
        updateActionMulti={tableUpdateActionMulti}
        customAddForm={AddForm}
        customEditFormSingle={EditFormSingle}
        customEditFormMulti={EditFormMulti}
      />
  )
}