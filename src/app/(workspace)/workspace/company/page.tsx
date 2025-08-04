export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    console.log(params)

    return <div>Comming Soon - Company Page</div>;
}