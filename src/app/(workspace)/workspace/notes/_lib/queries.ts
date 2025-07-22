import { createClient } from "@/lib/supabase/server"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { NoteWithAssociations, Contact, Meeting } from "./validations"
import { PostgrestError } from "@supabase/supabase-js"

export async function getContacts(): Promise<{
  data: Contact[],
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("new_contacts")
    .select("id, first_name, last_name, company:new_companies(id, name)")
    .order("first_name", { ascending: true })
  
  // Transform the data to match the Contact type
  const transformedData = data?.map(contact => ({
    id: contact.id,
    first_name: contact.first_name,
    last_name: contact.last_name,
    company: contact.company?.[0] ? {
      id: contact.company[0].id,
      name: contact.company[0].name
    } : undefined
  })) || []
  
  return { data: transformedData, error }
}

export async function getMeetings(): Promise<{
  data: Meeting[],
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("meetings")
    .select("id, title, meeting_at")
    .order("meeting_at", { ascending: false })
  
  return { data: data ?? [], error }
}

export async function getNotes(searchParams: SearchParams): Promise<{
  data: NoteWithAssociations[],
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
    .from("notes")
    .select(`
      *,
      contacts:contact_notes(
        contact:new_contacts(
          id,
          first_name,
          last_name,
          company:new_companies(name)
        )
      ),
      meetings:meeting_notes(
        meeting:meetings(
          id,
          title,
          meeting_at
        )
      )
    `, { count: "exact" })

  // Sorting
  if (sort.length > 0) {
    sort.forEach(s => {
      switch (s.id) {
        case "content":
          query = query.order("content", { ascending: !s.desc })
          break
        case "associations":
          // Sort by number of associations (contacts + meetings)
          query = query.order("created_at", { ascending: !s.desc })
          break
        default:
          query = query.order(s.id, { ascending: !s.desc })
      }
    })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  // Filtering
  filters.forEach(filter => {
    const { id: columnId, value: filterValue } = filter
    if (typeof filterValue === 'object' && filterValue !== null && 'operator' in filterValue) {
      const { operator, value } = filterValue as { operator: string, value: unknown }

      if (!operator || value === null || value === undefined || (typeof value === 'string' && value === '')) return

      switch (columnId) {
        case "content":
          if (operator === "iLike") {
            query = query.ilike("content", `%${value}%`)
          }
          break
        case "associations":
          // Filter by associations - this would need a more complex query
          // For now, we'll handle this client-side
          console.warn("Association filtering not implemented at query level")
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

  // Process the data to flatten the associations
  const processedData = data?.map(note => ({
    ...note,
    contacts: note.contacts?.map((cn: { contact: Contact }) => cn.contact).filter(Boolean) || [],
    meetings: note.meetings?.map((mn: { meeting: Meeting }) => mn.meeting).filter(Boolean) || []
  })) || []

  return {
    data: processedData as NoteWithAssociations[],
    count: count ?? 0,
    error
  }
}

export async function getNoteById(noteId: string) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      throw new Error("User not authenticated")
    }

    // Fetch note with all related data
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select(`
        *,
        contacts:contact_notes(
          contact:new_contacts(
            id,
            first_name,
            last_name,
            company:new_companies(name)
          )
        ),
        meetings:meeting_notes(
          meeting:meetings(
            id,
            title,
            meeting_at
          )
        )
      `)
      .eq("id", noteId)
      .eq("user_id", user.id) // Ensure user can only access their own notes
      .single()

    if (noteError) {
      console.error("Error fetching note:", noteError)
      throw new Error(noteError.message)
    }

    if (!note) {
      throw new Error("Note not found")
    }

    // Process the associations
    const contacts = note.contacts?.map((cn: { contact: Contact }) => cn.contact).filter(Boolean) || []
    const meetings = note.meetings?.map((mn: { meeting: Meeting }) => mn.meeting).filter(Boolean) || []

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      contacts,
      meetings,
      created_at: note.created_at,
      updated_at: note.updated_at
    }
  } catch (error) {
    console.error("Unexpected error fetching note:", error)
    throw error
  }
}


