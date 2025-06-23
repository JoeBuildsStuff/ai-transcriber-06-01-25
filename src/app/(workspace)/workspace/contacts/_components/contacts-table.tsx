import { columns } from "./contacts-columns"
import { DataTable } from "@/components/data-table/data-table"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { getContacts } from "../_lib/queries"

interface DataTableExampleContactsProps {
  searchParams?: SearchParams
}

export default async function DataTableExampleContacts({ 
  searchParams = {} 
}: DataTableExampleContactsProps) {
  const { data, count, error } = await getContacts(searchParams)
  const { pagination } = parseSearchParams(searchParams)

  if (error) {
    // TODO: Add a toast notification
    console.error(error)
  }

  const pageCount = Math.ceil((count ?? 0) / (pagination?.pageSize ?? 10))
  const initialState = parseSearchParams(searchParams)

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