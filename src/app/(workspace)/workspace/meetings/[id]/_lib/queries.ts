import { createClient } from "@/lib/supabase/server"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { MeetingsList } from "./validations"
import { PostgrestError } from "@supabase/supabase-js"

export async function getMeetingsList(searchParams: SearchParams): Promise<{ 
  data: MeetingsList[], 
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

  // Check if we have a speakers_new filter
  const speakersFilter = filters.find(filter => filter.id === 'speakers')
  const hasSpeakersFilter = !!speakersFilter

  let meetingIds: string[] = []
  
  // If we have a speakers filter, first get the meeting IDs from meeting_speakers
  if (hasSpeakersFilter && speakersFilter) {
    const { operator, value } = speakersFilter.value as { operator: string, value: unknown }
    const searchValue = String(value).toLowerCase()
    
    let speakersQuery = supabase
      .schema("ai_transcriber")
      .from("meeting_speakers")
      .select("meeting_id")
    
    switch (operator) {
      case "iLike":
        speakersQuery = speakersQuery.or(`speaker_name.ilike.%${searchValue}%`)
        break
      case "notILike":
        speakersQuery = speakersQuery.not('speaker_name', 'ilike', `%${searchValue}%`)
        break
      case "eq":
        speakersQuery = speakersQuery.eq('speaker_name', searchValue)
        break
      case "ne":
        speakersQuery = speakersQuery.neq('speaker_name', searchValue)
        break
      case "isEmpty":
        // For isEmpty, we need to find meetings that have no speakers
        // This requires a different approach - we'll handle it in the main query
        break
      case "isNotEmpty":
        // For isNotEmpty, we need to find meetings that have at least one speaker
        // This also requires a different approach
        break
      default:
        break
    }
    
    const { data: speakersData, error: speakersError } = await speakersQuery
    
    if (speakersError) {
      console.error("Error fetching speaker data:", speakersError)
      return { data: [], count: 0, error: speakersError }
    }
    
    // Extract unique meeting IDs
    meetingIds = [...new Set(speakersData?.map(s => s.meeting_id) || [])]
  }

  let query = supabase
    .schema("ai_transcriber")
    .from("meetings")
    .select(`
      id, 
      meeting_reviewed, 
      title, 
      meeting_at, 
      created_at, 
      updated_at, 
      meeting_speakers(
        id,
        meeting_id,
        speaker_index,
        speaker_name,
        contact_id,
        new_contacts!meeting_speakers_contact_id_fkey(
          first_name,
          last_name
        )
      )
    `, { count: "exact" })

  // Apply meeting ID filter if we have speaker filter results
  if (hasSpeakersFilter && meetingIds.length > 0) {
    query = query.in('id', meetingIds)
  } else if (hasSpeakersFilter && meetingIds.length === 0) {
    // If no meetings match the speaker filter, return empty results
    return { data: [], count: 0, error: null }
  }

  // Handle isEmpty and isNotEmpty for speakers
  if (hasSpeakersFilter && speakersFilter) {
    const { operator } = speakersFilter.value as { operator: string, value: unknown }
    
    if (operator === "isEmpty") {
      // For isEmpty, we'll handle this by getting all meeting IDs that have speakers
      // and then excluding them from the main query
      const { data: meetingsWithSpeakers } = await supabase
        .schema("ai_transcriber")
        .from("meeting_speakers")
        .select("meeting_id")
      
      const meetingIdsWithSpeakers = [...new Set(meetingsWithSpeakers?.map(s => s.meeting_id) || [])]
      
      if (meetingIdsWithSpeakers.length > 0) {
        query = query.not('id', 'in', meetingIdsWithSpeakers)
      }
    } else if (operator === "isNotEmpty") {
      // For isNotEmpty, we'll get all meeting IDs that have speakers
      const { data: meetingsWithSpeakers } = await supabase
        .schema("ai_transcriber")
        .from("meeting_speakers")
        .select("meeting_id")
      
      const meetingIdsWithSpeakers = [...new Set(meetingsWithSpeakers?.map(s => s.meeting_id) || [])]
      
      if (meetingIdsWithSpeakers.length > 0) {
        query = query.in('id', meetingIdsWithSpeakers)
      } else {
        // If no meetings have speakers, return empty results
        return { data: [], count: 0, error: null }
      }
    }
  }

  // Sorting
  if (sort.length > 0) {
    sort.forEach(s => {
      query = query.order(s.id, { ascending: !s.desc })
    })
  } else {
    query = query.order("meeting_at", { ascending: false })
  }

  // Filtering - exclude speakers filter since we handled it above
  const nonSpeakersFilters = filters.filter(filter => filter.id !== 'speakers')
  
  nonSpeakersFilters.forEach(filter => {
    const { id: columnId, value: filterValue } = filter
    if (typeof filterValue === 'object' && filterValue !== null && 'operator' in filterValue) {
      const { operator, value } = filterValue as { operator: string, value: unknown }

      if (!operator || value === null || value === undefined || (typeof value === 'string' && value === '')) return

      // Standard filtering for other columns
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
  })

  // Pagination
  const from = pageIndex * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  // Transform the data to flatten the nested speaker structure
  const transformedData = data?.map(meeting => {
    const speakers = meeting.meeting_speakers?.map(speaker => ({
      id: speaker.id,
      meeting_id: speaker.meeting_id,
      speaker_index: speaker.speaker_index,
      speaker_name: speaker.speaker_name,
      contact_id: speaker.contact_id,
      first_name: speaker.new_contacts?.first_name || null,
      last_name: speaker.new_contacts?.last_name || null,
    })) || []

    return {
      id: meeting.id,
      meeting_reviewed: meeting.meeting_reviewed,
      title: meeting.title,
      meeting_at: meeting.meeting_at,
      speakers: speakers,
      created_at: meeting.created_at,
      updated_at: meeting.updated_at,
    }
  }) || []

  return { 
    data: transformedData as MeetingsList[], 
    count: count ?? 0,
    error 
  }
}
