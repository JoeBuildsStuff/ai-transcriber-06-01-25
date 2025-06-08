import DataTableAdvancedContacts from "@/components/table/data-table-advanced-contacts";

export default async function ContactsPage() {
    return (
        <div className="w-full mt-5">
            <DataTableAdvancedContacts searchParams={Promise.resolve({})} />
        </div>
    )
}