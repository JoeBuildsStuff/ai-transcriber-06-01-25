import { columns } from "./columns"
import { DataTable } from "@/components/data-table/data-table"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { getMeetingsList } from "../../meetings/[id]/_lib/queries"
import { createMeeting, deleteMeetings, updateMeeting, multiUpdateMeetings } from "../../meetings/[id]/_lib/actions"

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
      created_at: false,
      updated_at: false,
      summary: false,
      original_file_name: false,
    },
  }

  return (
    <div className="">
      <DataTable 
        columns={columns} 
        data={data} 
        pageCount={pageCount}
        initialState={initialState}
        createAction={createMeeting}
        updateActionSingle={updateMeeting}
        updateActionMulti={multiUpdateMeetings}
        deleteAction={deleteMeetings}
      />
    </div>
  )
}