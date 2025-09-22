import DataTableTasks from "./_components/table"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  return (
    <main className="p-1">
      <DataTableTasks searchParams={params} />
    </main>
  )
}