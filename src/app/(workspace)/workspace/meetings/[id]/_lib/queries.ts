import { createClient } from "@/lib/supabase/server"
import { parseSearchParams, SearchParams } from "@/lib/data-table"
import { MeetingsList } from "./validations"
import { Tag } from "@/types"
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

  // Check if we have a speakers filter
  const speakersFilter = filters.find(filter => filter.id === 'speakers')
  const hasSpeakersFilter = !!speakersFilter
  
  // Check if we have an attendees filter
  const attendeesFilter = filters.find(filter => filter.id === 'attendees')
  const hasAttendeesFilter = !!attendeesFilter

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
  
  // If we have an attendees filter, get the meeting IDs from meeting_attendees
  if (hasAttendeesFilter && attendeesFilter) {
    const { operator, value } = attendeesFilter.value as { operator: string, value: unknown }
    const searchValue = String(value).toLowerCase()
    
    // Use a simpler approach - search in contacts table first, then get meeting IDs
    let contactsQuery = supabase
      .schema("ai_transcriber")
      .from("new_contacts")
      .select("id")
    
    switch (operator) {
      case "iLike":
        // Search for contacts where first_name or last_name contains the search value
        // If search value contains a space, split it and search for first_name AND last_name
        if (searchValue.includes(' ')) {
          const [firstName, lastName] = searchValue.split(' ', 2)
          contactsQuery = contactsQuery
            .ilike('first_name', `%${firstName}%`)
            .ilike('last_name', `%${lastName}%`)
        } else {
          contactsQuery = contactsQuery.or(`first_name.ilike.%${searchValue}%,last_name.ilike.%${searchValue}%`)
        }
        break
      case "notILike":
        contactsQuery = contactsQuery
          .not('first_name', 'ilike', `%${searchValue}%`)
          .not('last_name', 'ilike', `%${searchValue}%`)
        break
      case "eq":
        // If search value contains a space, split it and search for first_name AND last_name
        if (searchValue.includes(' ')) {
          const [firstName, lastName] = searchValue.split(' ', 2)
          contactsQuery = contactsQuery
            .eq('first_name', firstName)
            .eq('last_name', lastName)
        } else {
          contactsQuery = contactsQuery.or(`first_name.eq.${searchValue},last_name.eq.${searchValue}`)
        }
        break
      case "ne":
        contactsQuery = contactsQuery
          .not('first_name', 'eq', searchValue)
          .not('last_name', 'eq', searchValue)
        break
      case "isEmpty":
        // For isEmpty, we need to find meetings that have no attendees
        break
      case "isNotEmpty":
        // For isNotEmpty, we need to find meetings that have at least one attendee
        break
      default:
        break
    }
    
    const { data: contactsData, error: contactsError } = await contactsQuery
    
    if (contactsError) {
      console.error("Error fetching contact data:", contactsError)
      return { data: [], count: 0, error: contactsError }
    }
    
    if (contactsData && contactsData.length > 0) {
      // Now get meeting IDs for these contacts
      const contactIds = contactsData.map(c => c.id)
      const { data: attendeesData, error: attendeesError } = await supabase
        .schema("ai_transcriber")
        .from("meeting_attendees")
        .select("meeting_id")
        .in('contact_id', contactIds)
      
      if (attendeesError) {
        console.error("Error fetching attendee data:", attendeesError)
        return { data: [], count: 0, error: attendeesError }
      }
      
      // Extract unique meeting IDs from attendees
      const attendeeMeetingIds = [...new Set(attendeesData?.map(a => a.meeting_id) || [])]
      
      // If we already have speaker meeting IDs, intersect them; otherwise use attendee IDs
      if (hasSpeakersFilter && meetingIds.length > 0) {
        meetingIds = meetingIds.filter(id => attendeeMeetingIds.includes(id))
      } else {
        meetingIds = attendeeMeetingIds
      }
    } else {
      // No contacts found, so no meetings match
      meetingIds = []
    }
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
      ),
      meeting_tags:meeting_tags (
        tag:tags (
          id,
          name,
          description,
          user_id,
          created_at,
          updated_at
        )
      )
    `, { count: "exact" })

  // Apply meeting ID filter if we have speaker or attendee filter results
  if ((hasSpeakersFilter || hasAttendeesFilter) && meetingIds.length > 0) {
    query = query.in('id', meetingIds)
  } else if ((hasSpeakersFilter || hasAttendeesFilter) && meetingIds.length === 0) {
    // If no meetings match the speaker/attendee filter, return empty results
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

  // Filtering - exclude speakers and attendees filters since we handled them above
  const nonSpeakersFilters = filters.filter(filter => filter.id !== 'speakers' && filter.id !== 'attendees')
  
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
        case "gte":
          query = query.gte(columnId, value)
          break
        case "lte":
          query = query.lte(columnId, value)
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

    const tags = (meeting.meeting_tags ?? [])
      .map(meetingTag => meetingTag.tag)
      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
      .map<Tag>(tag => ({
        id: tag.id,
        name: tag.name,
        description: tag.description,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
        user_id: tag.user_id,
      }))

    return {
      id: meeting.id,
      meeting_reviewed: meeting.meeting_reviewed,
      title: meeting.title,
      meeting_at: meeting.meeting_at,
      speakers: speakers,
      created_at: meeting.created_at,
      updated_at: meeting.updated_at,
      tags,
    }
  }) || []

  return { 
    data: transformedData as MeetingsList[], 
    count: count ?? 0,
    error 
  }
}
