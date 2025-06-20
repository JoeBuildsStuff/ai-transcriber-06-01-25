import DataTableAdvancedContacts from "@/components/table/data-table-advanced-contacts";

export default async function ContactsPage({
    searchParams,
  }: {
    searchParams: { [key:string]: string | string[] | undefined };
  }) {
    return (
        <div className="w-full mt-5">
            <DataTableAdvancedContacts searchParams={searchParams} />
        </div>
    )
}