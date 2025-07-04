import DataTableContacts from "./_components/contacts-table"

export default async function NewContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  return (
    <main className="mx-auto">
      <DataTableContacts searchParams={params} />
    </main>
  )
}