import DataTableMeetings from "@/app/(workspace)/workspace/meetings/_components/table";

export default async function DataTableMeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
    
    return (
        <div className="w-full">
             <DataTableMeetings searchParams={params} />     
        </div>
    )
}