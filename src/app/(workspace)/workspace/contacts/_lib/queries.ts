import { createClient } from "@/lib/supabase/server"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { PersonWithRelations, Company, PersonEmail, PersonPhone } from "./validations"
import { PostgrestError } from "@supabase/supabase-js"

export async function getCompanies(): Promise<{
  data: Company[],
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("new_companies")
    .select("*")
    .order("name", { ascending: true })
  
  return { data: data ?? [], error }
}

export async function getPersons(searchParams: SearchParams): Promise<{
  data: PersonWithRelations[],
  count: number,
  error: PostgrestError | null
}> {
  const supabase = await createClient()
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
  const processedData = (data as unknown as PersonWithRelations[])?.map(person => ({
    ...person,
    emails: person.emails?.sort((a, b) => a.display_order - b.display_order) || [],
    phones: person.phones?.sort((a, b) => a.display_order - b.display_order) || []
  })) || []

  return {
    data: processedData,
    count: count ?? 0,
    error
  }
}

export async function getContactById(contactId: string) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      throw new Error("User not authenticated")
    }

    // Fetch contact with all related data
    const { data: contact, error: contactError } = await supabase
      .from("new_contacts")
      .select(`
        *,
        company:new_companies(*),
        emails:new_contact_emails(*),
        phones:new_contact_phones(*)
      `)
      .eq("id", contactId)
      .eq("user_id", user.id) // Ensure user can only access their own contacts
      .single()

    if (contactError) {
      console.error("Error fetching contact:", contactError)
      throw new Error(contactError.message)
    }

    if (!contact) {
      throw new Error("Contact not found")
    }

    // Sort emails and phones by display_order
    const sortedEmails = contact.emails?.sort((a: PersonEmail, b: PersonEmail) => a.display_order - b.display_order) || []
    const sortedPhones = contact.phones?.sort((a: PersonPhone, b: PersonPhone) => a.display_order - b.display_order) || []

    // Transform to match the expected format from the page component
    return {
      id: contact.id,
      firstName: contact.first_name || '',
      lastName: contact.last_name || '',
      displayName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact',
      nickname: contact.nickname || '',
      tags: contact.tags || [],
      primaryEmail: sortedEmails[0]?.email || '',
      primaryPhone: sortedPhones[0]?.phone || '',
      birthday: contact.birthday || '',
      company: contact.company?.name || '',
      jobTitle: contact.job_title || '',
      notes: contact.notes || '',
      isFavorite: contact.is_favorite || false,
      city: contact.city || '',
      state: contact.state || '',
      linkedin: contact.linkedin || '',
      description: contact.description || '',
      emails: sortedEmails,
      phones: sortedPhones,
      created_at: contact.created_at,
      updated_at: contact.updated_at
    }
  } catch (error) {
    console.error("Unexpected error fetching contact:", error)
    throw error
  }
}


