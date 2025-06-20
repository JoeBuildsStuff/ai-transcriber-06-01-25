import DataTableAdvancedContacts from "@/components/table/data-table-advanced-contacts";

export default async function ContactsPage({
    searchParams,
  }: {
    searchParams: Promise<{ [key:string]: string | string[] | undefined }>;
  }) {
    const resolvedSearchParams = await searchParams;
    
    return (
        <div className="w-full mt-5">
            <DataTableAdvancedContacts searchParams={resolvedSearchParams} />
        </div>
    )
}