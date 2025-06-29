import DataTableContacts from "@/app/(workspace)/workspace/contacts/_components/contacts-table";

export default async function DataTableContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
    
    return (
        <div className="w-full mt-5">
             <DataTableContacts searchParams={params} />     
        </div>
    )
}