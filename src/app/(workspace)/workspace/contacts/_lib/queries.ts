import { createClient } from "@/lib/supabase/server"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { ContactWithRelations, Company } from "./validations"
import { PostgrestError } from "@supabase/supabase-js"

export async function getCompanies(): Promise<{
  data: Company[],
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  
  // Get the current user to filter companies by user_id
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error("Error getting current user:", userError)
    return { 
      data: [], 
      error: {
        message: "User not authenticated",
        details: userError?.message || "Authentication required",
        hint: "Please log in to access companies",
        code: "AUTH_ERROR"
      } as PostgrestError
    }
  }

  const { data, error } = await supabase
    .from("new_companies")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true })
  
  // Transform the data to match our Company type
  const transformedData = data?.map(company => ({
    ...company,
    created_at: company.created_at || undefined,
    description: company.description || undefined,
    user_id: company.user_id || undefined,
  })) as Company[] || []
  
  return { data: transformedData, error }
}

export async function getContacts(searchParams: SearchParams): Promise<{
  data: ContactWithRelations[],
  count: number,
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  
  // Get the current user to filter contacts by user_id
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error("Error getting current user:", userError)
    return { 
      data: [], 
      count: 0, 
      error: {
        message: "User not authenticated",
        details: userError?.message || "Authentication required",
        hint: "Please log in to access contacts",
        code: "AUTH_ERROR"
      } as PostgrestError
    }
  }

  const {
    pagination,
    sorting,
    columnFilters
  } = parseSearchParams(searchParams)

  const { pageIndex, pageSize } = pagination ?? { pageIndex: 0, pageSize: 10 }
  const sort = sorting ?? []
  const filters = columnFilters ?? []

  let query = supabase
    .from("new_contacts")
    .select(`
      *,
      company:new_companies(*),
      emails:new_contact_emails(*),
      phones:new_contact_phones(*)
    `, { count: "exact" })
    .eq("user_id", user.id) // Filter by current user

  // Sorting
  if (sort.length > 0) {
    sort.forEach(s => {
      // Handle computed columns and related data sorting
      switch (s.id) {
        case "display_name":
          query = query.order("first_name", { ascending: !s.desc })
          break
        case "company_name":
          // Note: Sorting by related table requires a different approach
          // For now, we'll sort by company_id and handle display sorting client-side
          query = query.order("company_id", { ascending: !s.desc })
          break
        case "primary_email":
        case "primary_phone":
          // These are computed from related tables, sort by contact name instead
          query = query.order("first_name", { ascending: !s.desc })
          break
        case "location":
          query = query.order("city", { ascending: !s.desc })
          break
        default:
          query = query.order(s.id, { ascending: !s.desc })
      }
    })
  } else {
    query = query.order("first_name", { ascending: true })
  }

  // Filtering
  filters.forEach(filter => {
    const { id: columnId, value: filterValue } = filter
    if (typeof filterValue === 'object' && filterValue !== null && 'operator' in filterValue) {
      const { operator, value } = filterValue as { operator: string, value: unknown }

      if (!operator || value === null || value === undefined || (typeof value === 'string' && value === '')) return

      // Handle computed/virtual columns
      switch (columnId) {
        case "display_name":
          // Search in both first_name and last_name
          if (operator === "iLike") {
            query = query.or(`first_name.ilike.%${value}%,last_name.ilike.%${value}%`)
          }
          break
        case "company_name":
          // Filter by company name through the relationship
          // Note: This requires a more complex query structure
          if (operator === "iLike") {
            // We'll need to handle this client-side or use a different approach
            // For now, skip company name filtering in the query
            console.warn("Company name filtering not implemented at query level")
          }
          break
        case "primary_email":
          // Filter contacts that have emails matching the criteria
          // This requires a subquery approach
          if (operator === "iLike") {
            // We'll handle this client-side for now
            console.warn("Email filtering not implemented at query level")
          }
          break
        case "primary_phone":
          // Similar to email filtering
          if (operator === "iLike") {
            console.warn("Phone filtering not implemented at query level")
          }
          break
        case "location":
          // Search in both city and state
          if (operator === "iLike") {
            query = query.or(`city.ilike.%${value}%,state.ilike.%${value}%`)
          }
          break
        default:
          // Handle regular columns
          switch (operator) {
            case "iLike":
              query = query.ilike(columnId, `%${value}%`)
              break
            case "notILike":
              query = query.not(columnId, 'ilike', `%${value}%`)
              break
            case "eq":
              query = query.eq(columnId, value)
              break
            case "ne":
              query = query.neq(columnId, value)
              break
            case "lt":
              query = query.lt(columnId, value)
              break
            case "gt":
              query = query.gt(columnId, value)
              break
            case "inArray":
              query = query.in(columnId, value as (string | number)[])
              break
            case "notInArray":
              query = query.not(columnId, 'in', `(${(value as (string | number)[]).join(',')})`)
              break
            case "isEmpty":
              query = query.or(`${columnId}.is.null,${columnId}.eq.""`)
              break
            case "isNotEmpty":
              query = query.not(columnId, 'is', null).not(columnId, 'eq', '""')
              break
            case "isBetween":
              if (Array.isArray(value) && value.length === 2) {
                query = query.gte(columnId, value[0]).lte(columnId, value[1])
              }
              break
            default:
              break
          }
      }
    }
  })

  // Pagination
  const from = pageIndex * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  // Sort emails and phones by display_order for consistent primary selection
  const processedData = (data as unknown as ContactWithRelations[])?.map(contact => ({
    ...contact,
    emails: contact.emails?.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)) || [],
    phones: contact.phones?.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)) || []
  })) || []

  return {
    data: processedData,
    count: count ?? 0,
    error
  }
}

