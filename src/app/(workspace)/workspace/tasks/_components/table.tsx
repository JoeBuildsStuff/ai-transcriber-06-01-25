
import { DataTable } from "@/components/data-table/data-table"
import { TableWithPageContext } from "@/components/chat/table-with-context"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { ColumnDef } from "@tanstack/react-table"

import { columns } from "./columns"
import { getTasks } from "../_lib/queries"
import { deleteTasks, createTask, updateTask, multiUpdateTasks } from "../_lib/actions"
import { TaskAddForm, TaskEditForm, TaskMultiEditForm } from "./form-wrapper"

interface DataTableTasksProps {
  searchParams?: SearchParams
}

export default async function DataTableTasks({ 
  searchParams = {} 
}: DataTableTasksProps) {
  const { data, count, error } = await getTasks(searchParams)
  const { pagination } = parseSearchParams(searchParams)

  if (error) {
    console.error(error)
  }

  const pageCount = Math.ceil((count ?? 0) / (pagination?.pageSize ?? 10))
  const initialState = {
    ...parseSearchParams(searchParams),
  }

  // Cast the data and actions to match DataTable's expected types
  const tableData = data as unknown as Record<string, unknown>[]
  const tableColumns = columns as ColumnDef<Record<string, unknown>, unknown>[]
  
  const tableDeleteAction = deleteTasks as (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  const tableCreateAction = createTask as unknown as (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  const tableUpdateActionSingle = updateTask as unknown as (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  const tableUpdateActionMulti = multiUpdateTasks as unknown as (ids: string[], data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>

  const AddForm = TaskAddForm as React.ComponentType<{
    onSuccess?: () => void
    onCancel?: () => void
    createAction?: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; data?: { id: string } }>
  }>

  const EditFormSingle = TaskEditForm as React.ComponentType<{
    data: Record<string, unknown>
    onSuccess?: () => void
    onCancel?: () => void
    updateAction?: (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }>

  const EditFormMulti = TaskMultiEditForm as React.ComponentType<{
    selectedCount: number
    selectedNoteIds?: string[]
    onSuccess?: () => void
    onCancel?: () => void
    updateActionMulti?: (ids: string[], data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  }>

  return (
    <TableWithPageContext data={tableData} count={count ?? 0}>
      <DataTable 
        columns={tableColumns} 
        data={tableData} 
        pageCount={pageCount}
        initialState={initialState}
        tableKey="tasks"
        deleteAction={tableDeleteAction}
        createAction={tableCreateAction}
        updateActionSingle={tableUpdateActionSingle}
        updateActionMulti={tableUpdateActionMulti}
        customAddForm={AddForm}
        customEditFormSingle={EditFormSingle}
        customEditFormMulti={EditFormMulti}
      />
    </TableWithPageContext>
  )
}
