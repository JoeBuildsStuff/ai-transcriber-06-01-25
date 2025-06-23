import { columns } from "./meetings-columns"
import { DataTable } from "@/components/data-table/data-table"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { getMeetingsList } from "../_lib/queries"

interface DataTableMeetingsProps {
  searchParams?: SearchParams
}

export default async function DataTableMeetings({ 
  searchParams = {} 
}: DataTableMeetingsProps) {
  const { data, count, error } = await getMeetingsList(searchParams)
  const { pagination } = parseSearchParams(searchParams)

  if (error) {
    // TODO: Add a toast notification
    console.error(error)
  }

  const pageCount = Math.ceil((count ?? 0) / (pagination?.pageSize ?? 10))
  const initialState = {
    ...parseSearchParams(searchParams),
    columnVisibility: {
      user_notes: false,
      created_at: false,
      updated_at: false,
    },
  }

  return (
    <div className="">
      <DataTable 
        columns={columns} 
        data={data} 
        pageCount={pageCount}
        initialState={initialState}
      />
    </div>
  )
}