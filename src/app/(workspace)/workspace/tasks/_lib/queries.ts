import { createClient } from "@/lib/supabase/server"
import { normalizeFilterValue, parseSearchParams, SearchParams } from "@/lib/data-table"
import type { FilterVariant } from "@/lib/data-table"
import { TaskWithAssociations, TaskContactSummary, TaskMeetingSummary, TaskOwnerSummary, TaskTagSummary } from "./validations"
import { PostgrestError } from "@supabase/supabase-js"

export async function getContacts(): Promise<{
  data: TaskContactSummary[],
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("new_contacts")
    .select("id, first_name, last_name, company:new_companies(id, name)")
    .order("first_name", { ascending: true })
  
  // Transform the data to match the TaskContactSummary type
  const transformedData = data?.map(contact => ({
    id: contact.id,
    first_name: contact.first_name,
    last_name: contact.last_name,
    company_name: contact.company?.[0] ? contact.company[0].name : undefined
  })) || []
  
  return { data: transformedData, error }
}

export async function getMeetings(): Promise<{
  data: TaskMeetingSummary[],
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("meetings")
    .select("id, title, meeting_at")
    .order("meeting_at", { ascending: false })
  
  return { data: data ?? [], error }
}

export async function getTags(): Promise<{
  data: TaskTagSummary[],
  error: PostgrestError | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, description")
    .order("name", { ascending: true })

  const transformedData = data?.map(tag => ({
    id: tag.id,
    name: tag.name,
    description: (tag as { description?: string | null }).description ?? null
  })) ?? []

  return { data: transformedData, error }
}

export async function getTasks(searchParams: SearchParams): Promise<{
  data: TaskWithAssociations[],
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
    .from("tasks")
    .select(`
      *,
      owner:owner_contact_id(
        id,
        first_name,
        last_name,
        company:new_companies(name)
      ),
      contacts:task_contacts(
        contact:new_contacts(
          id,
          first_name,
          last_name,
          company:new_companies(name)
        )
      ),
      meetings:task_meetings(
        meeting:meetings(
          id,
          title,
          meeting_at
        )
      ),
      tags:task_tags(
        tag:tags(
          id,
          name,
          description
        )
      )
    `, { count: "exact" })

  // Sorting
  if (sort.length > 0) {
    sort.forEach(s => {
      switch (s.id) {
        case "title":
          query = query.order("title", { ascending: !s.desc })
          break
        case "associations":
          // Sort by number of associations (contacts + meetings + tags)
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
      const { operator, value, variant } = filterValue as { operator: string, value: unknown, variant?: FilterVariant }
      const normalizedValue = normalizeFilterValue(value, variant)

      if (
        !operator ||
        normalizedValue === null ||
        normalizedValue === undefined ||
        (typeof normalizedValue === 'string' && normalizedValue === '')
      ) {
        return
      }

      switch (columnId) {
        case "title":
          if (operator === "iLike") {
            query = query.ilike("title", `%${normalizedValue}%`)
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
              query = query.ilike(columnId, `%${normalizedValue}%`)
              break
            case "notILike":
              query = query.not(columnId, 'ilike', `%${normalizedValue}%`)
              break
            case "eq":
              query = query.eq(columnId, normalizedValue as string | number | boolean)
              break
            case "ne":
              query = query.neq(columnId, normalizedValue as string | number | boolean)
              break
            case "lt":
              query = query.lt(columnId, normalizedValue as string | number)
              break
            case "gt":
              query = query.gt(columnId, normalizedValue as string | number)
              break
            case "inArray":
              if (Array.isArray(normalizedValue)) {
                query = query.in(columnId, normalizedValue as (string | number)[])
              }
              break
            case "notInArray":
              if (Array.isArray(normalizedValue)) {
                query = query.not(columnId, 'in', `(${(normalizedValue as (string | number)[]).join(',')})`)
              }
              break
            case "isEmpty":
              query = query.or(`${columnId}.is.null,${columnId}.eq.""`)
              break
            case "isNotEmpty":
              query = query.not(columnId, 'is', null).not(columnId, 'eq', '""')
              break
            case "isBetween":
              if (Array.isArray(normalizedValue) && normalizedValue.length === 2) {
                query = query
                  .gte(columnId, normalizedValue[0] as string | number)
                  .lte(columnId, normalizedValue[1] as string | number)
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
  const processedData = data?.map(task => ({
    ...task,
    owner: (() => {
      const ownerData = (task as Record<string, unknown>).owner as
        | TaskOwnerSummary
        | TaskOwnerSummary[]
        | { company?: { name?: string | null }[]; [key: string]: unknown }
        | null
        | undefined

      if (!ownerData) return null

      const ownerRecord = Array.isArray(ownerData) ? ownerData[0] : ownerData
      if (!ownerRecord) return null

      const companyArray = (ownerRecord as { company?: { name?: string | null }[] }).company
      const companyName = Array.isArray(companyArray) && companyArray.length > 0
        ? companyArray[0]?.name ?? null
        : null

      return {
        id: ownerRecord.id,
        first_name: ownerRecord.first_name,
        last_name: ownerRecord.last_name,
        company_name: companyName,
      } as TaskOwnerSummary
    })(),
    contacts: task.contacts?.map((tc: { contact: TaskContactSummary }) => tc.contact).filter(Boolean) || [],
    meetings: task.meetings?.map((tm: { meeting: TaskMeetingSummary }) => tm.meeting).filter(Boolean) || [],
    tags: task.tags?.map((tt: { tag: TaskTagSummary }) => tt.tag).filter(Boolean) || []
  })) || []

  return {
    data: processedData as TaskWithAssociations[],
    count: count ?? 0,
    error
  }
}

export async function getTaskById(taskId: string) {
  const supabase = await createClient()
  
  try {
    // Get the current user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error("Error getting current user:", userError)
      throw new Error("User not authenticated")
    }

    // Fetch task with all related data
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(`
        *,
        owner:owner_contact_id(
          id,
          first_name,
          last_name,
          company:new_companies(name)
        ),
        contacts:task_contacts(
          contact:new_contacts(
            id,
            first_name,
            last_name,
            company:new_companies(name)
          )
        ),
        meetings:task_meetings(
          meeting:meetings(
            id,
            title,
            meeting_at
          )
        ),
        tags:task_tags(
          tag:tags(
            id,
            name,
            description
          )
        )
      `)
      .eq("id", taskId)
      .eq("user_id", user.id) // Ensure user can only access their own tasks
      .single()

    if (taskError) {
      console.error("Error fetching task:", taskError)
      throw new Error(taskError.message)
    }

    if (!task) {
      throw new Error("Task not found")
    }

    // Process the associations
    const ownerData = (task as Record<string, unknown>).owner as
      | TaskOwnerSummary
      | TaskOwnerSummary[]
      | { company?: { name?: string | null }[]; [key: string]: unknown }
      | null

    const owner = (() => {
      if (!ownerData) return undefined
      const ownerRecord = Array.isArray(ownerData) ? ownerData[0] : ownerData
      if (!ownerRecord) return undefined
      const companyArray = (ownerRecord as { company?: { name?: string | null }[] }).company
      const companyName = Array.isArray(companyArray) && companyArray.length > 0
        ? companyArray[0]?.name ?? null
        : null

      return {
        id: ownerRecord.id,
        first_name: ownerRecord.first_name,
        last_name: ownerRecord.last_name,
        company_name: companyName,
      } as TaskOwnerSummary
    })()

    const contacts = task.contacts?.map((tc: { contact: TaskContactSummary }) => tc.contact).filter(Boolean) || []
    const meetings = task.meetings?.map((tm: { meeting: TaskMeetingSummary }) => tm.meeting).filter(Boolean) || []
    const tags = task.tags?.map((tt: { tag: TaskTagSummary }) => tt.tag).filter(Boolean) || []

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      start_at: task.start_at,
      due_at: task.due_at,
      owner_contact_id: task.owner_contact_id,
      owner,
      contacts,
      meetings,
      tags,
      created_at: task.created_at,
      updated_at: task.updated_at
    }
  } catch (error) {
    console.error("Unexpected error fetching task:", error)
    throw error
  }
}
