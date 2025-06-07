import DataTableAdvanced from "@/components/table/data-table-advanced";

export default async function ContactsPage() {


    return (
        <div className="w-full mt-5">
            <DataTableAdvanced searchParams={Promise.resolve({})} />
        </div>
    )
}