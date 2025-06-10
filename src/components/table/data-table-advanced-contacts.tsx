import { createClient } from '@/lib/supabase/server'
import DataTablePagination from './components/data-table-pagination'
import { DataTable } from './components/data-table'
import { columns } from './components/columns'
import { Contact } from '@/types'

export default async function DataTableAdvancedContacts({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { 
    currentPage = '1', 
    resultsPerPage = '10', 
    sort = '',
    filter = ''
  } = await searchParams

  const supabase = await createClient()

  // Parse sort parameters
  let orderBy: { column: string; ascending: boolean }[] = []
  if (Array.isArray(sort)) {
    // Handle multiple sort parameters
    orderBy = sort.map(sortParam => {
      // Decode the URL-encoded parameter
      const decodedParam = decodeURIComponent(sortParam)
      const [column, direction] = decodedParam.split(':')
      return {
        column,
        ascending: direction === 'asc'
      }
    })
  } else if (sort) {
    // Handle single sort parameter
    const decodedSort = decodeURIComponent(sort)
    const [column, direction] = decodedSort.split(':')
    orderBy = [{
      column,
      ascending: direction === 'asc'
    }]
  }

  // Parse filter parameters
  let filters: { column: string; operator: string; value: string }[] = []
  if (Array.isArray(filter)) {
    filters = filter.map(filterParam => {
      const decodedParam = decodeURIComponent(filterParam)
      const [column, operator, value] = decodedParam.split(':')
      return {
        column,
        operator,
        value
      }
    })
  } else if (filter) {
    const decodedFilter = decodeURIComponent(filter)
    const [column, operator, value] = decodedFilter.split(':')
    filters = [{
      column,
      operator,
      value
    }]
  }

  // First, get the total count of items
  let countQuery = supabase
    .schema('ai_transcriber')
    .from('contacts')
    .select('*', { count: 'exact', head: true })

  // Apply filters to count query
  filters.forEach(({ column, operator, value }) => {
    switch (operator) {
      case 'eq':
        countQuery = countQuery.eq(column, value)
        break
      case 'neq':
        countQuery = countQuery.neq(column, value)
        break
      case 'gt':
        countQuery = countQuery.gt(column, value)
        break
      case 'gte':
        countQuery = countQuery.gte(column, value)
        break
      case 'lt':
        countQuery = countQuery.lt(column, value)
        break
      case 'lte':
        countQuery = countQuery.lte(column, value)
        break
      case 'like':
        countQuery = countQuery.like(column, `%${value}%`)
        break
      // Add more operators as needed
    }
  })

  const { count } = await countQuery

  const totalItems = count || 0
  const totalPages = Math.ceil(totalItems / Number(resultsPerPage))

  // Build the base query
  let dataQuery = supabase
    .schema('ai_transcriber')
    .from('contacts')
    .select('*')
    .range((Number(currentPage) - 1) * Number(resultsPerPage), Number(currentPage) * Number(resultsPerPage) - 1)

  // Apply filters to data query
  filters.forEach(({ column, operator, value }) => {
    switch (operator) {
      case 'eq':
        dataQuery = dataQuery.eq(column, value)
        break
      case 'neq':
        dataQuery = dataQuery.neq(column, value)
        break
      case 'gt':
        dataQuery = dataQuery.gt(column, value)
        break
      case 'gte':
        dataQuery = dataQuery.gte(column, value)
        break
      case 'lt':
        dataQuery = dataQuery.lt(column, value)
        break
      case 'lte':
        dataQuery = dataQuery.lte(column, value)
        break
      case 'like':
        dataQuery = dataQuery.like(column, `%${value}%`)
        break
      // Add more operators as needed
    }
  })

  // Apply all sort orders dynamically
  orderBy.forEach(({ column, ascending }) => {
    dataQuery = dataQuery.order(column, { ascending })
  })

  const { data, error } = await dataQuery
    
  if (error) {
    console.error('Error fetching contacts:', error)
    throw new Error('Failed to fetch contacts')
  }

  return (
    <div className="space-y-4">
      <DataTable 
        data={data as unknown as Contact[]} 
        columns={columns} 
        pageCount={totalPages}
      />
      <DataTablePagination
        currentPage={Number(currentPage)}
        totalPages={totalPages}
        resultsPerPage={Number(resultsPerPage)}
      />
    </div>
  )
}
