import { createClient } from "@/lib/supabase/server"
import { normalizeFilterValue, parseSearchParams, SearchParams } from "@/lib/data-table"
import type { FilterVariant } from "@/lib/data-table"
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

  // Track filters that require joining helper tables
  const speakersFilter = filters.find(filter => filter.id === 'speakers')
  const hasSpeakersFilter = !!speakersFilter

  const attendeesFilter = filters.find(filter => filter.id === 'attendees')
  const hasAttendeesFilter = !!attendeesFilter

  const tagsFilter = filters.find(filter => filter.id === 'tags')
  const hasTagsFilter = !!tagsFilter

  let meetingIds: string[] | null = null
  let excludedMeetingIds: string[] = []

  const mergeMeetingIds = (currentIds: string[] | null, nextIds: string[]): string[] | null => {
    if (!nextIds.length) {
      return []
    }

    if (currentIds === null) {
      return nextIds
    }

    return currentIds.filter((id) => nextIds.includes(id))
  }
  
  // If we have a speakers filter, first get the meeting IDs from meeting_speakers
  if (hasSpeakersFilter && speakersFilter) {
    const { operator, value } = speakersFilter.value as { operator: string, value: unknown }
    const searchValue = String(value).toLowerCase()
    
    if (operator !== "isEmpty" && operator !== "isNotEmpty") {
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
        default:
          break
      }
      
      const { data: speakersData, error: speakersError } = await speakersQuery
      
      if (speakersError) {
        console.error("Error fetching speaker data:", speakersError)
        return { data: [], count: 0, error: speakersError }
      }
      
      const speakerMeetingIds = [...new Set(speakersData?.map((s) => s.meeting_id) || [])]
      meetingIds = mergeMeetingIds(meetingIds, speakerMeetingIds)
    }
  }
  
  // If we have an attendees filter, get the meeting IDs from meeting_attendees
  if (hasAttendeesFilter && attendeesFilter) {
    const { operator, value } = attendeesFilter.value as { operator: string, value: unknown }
    const searchValue = String(value).toLowerCase()
    
    if (operator !== "isEmpty" && operator !== "isNotEmpty") {
      // Use a simpler approach - search in contacts table first, then get meeting IDs
      let contactsQuery = supabase
        .schema("ai_transcriber")
        .from("new_contacts")
        .select("id")
      
      switch (operator) {
        case "iLike":
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
        default:
          break
      }
      
      const { data: contactsData, error: contactsError } = await contactsQuery
      
      if (contactsError) {
        console.error("Error fetching contact data:", contactsError)
        return { data: [], count: 0, error: contactsError }
      }
      
      if (contactsData && contactsData.length > 0) {
        const contactIds = contactsData.map((c) => c.id)
        const { data: attendeesData, error: attendeesError } = await supabase
          .schema("ai_transcriber")
          .from("meeting_attendees")
          .select("meeting_id")
          .in('contact_id', contactIds)
        
        if (attendeesError) {
          console.error("Error fetching attendee data:", attendeesError)
          return { data: [], count: 0, error: attendeesError }
        }
        
        const attendeeMeetingIds = [...new Set(attendeesData?.map((a) => a.meeting_id) || [])]
        meetingIds = mergeMeetingIds(meetingIds, attendeeMeetingIds)
      } else {
        meetingIds = mergeMeetingIds(meetingIds, [])
      }
    }
  }

  // If we have a tags filter, look up meeting IDs via meeting_tags
  if (hasTagsFilter && tagsFilter) {
    const { operator, value } = tagsFilter.value as { operator: string, value: unknown }
    const rawValue = typeof value === 'string' ? value.trim() : value !== undefined && value !== null ? String(value) : ''

    if (operator === "isEmpty") {
      const { data: meetingsWithTags, error: meetingsWithTagsError } = await supabase
        .schema("ai_transcriber")
        .from("meeting_tags")
        .select("meeting_id")

      if (meetingsWithTagsError) {
        console.error("Error fetching meeting tags for empty filter:", meetingsWithTagsError)
        return { data: [], count: 0, error: meetingsWithTagsError }
      }

      const meetingIdsWithTags = [...new Set(meetingsWithTags?.map((item) => item.meeting_id) || [])]
      if (meetingIdsWithTags.length > 0) {
        excludedMeetingIds = Array.from(new Set([...excludedMeetingIds, ...meetingIdsWithTags]))
      }
    } else if (operator === "isNotEmpty") {
      const { data: meetingsWithTags, error: meetingsWithTagsError } = await supabase
        .schema("ai_transcriber")
        .from("meeting_tags")
        .select("meeting_id")

      if (meetingsWithTagsError) {
        console.error("Error fetching meeting tags for not empty filter:", meetingsWithTagsError)
        return { data: [], count: 0, error: meetingsWithTagsError }
      }

      const meetingIdsWithTags = [...new Set(meetingsWithTags?.map((item) => item.meeting_id) || [])]
      meetingIds = mergeMeetingIds(meetingIds, meetingIdsWithTags)
    } else if (rawValue !== '') {
      const supportedOperators = new Set(["iLike", "notILike", "eq", "ne"])
      if (!supportedOperators.has(operator)) {
        // Unsupported operator for tags; skip without applying additional filtering
      } else {
        let tagsQuery = supabase
          .schema("ai_transcriber")
          .from("tags")
          .select("id")

        if (operator === "iLike" || operator === "notILike") {
          tagsQuery = tagsQuery.ilike('name', `%${rawValue}%`)
        } else if (operator === "eq" || operator === "ne") {
          tagsQuery = tagsQuery.eq('name', rawValue)
        }

        const { data: tagRecords, error: tagsError } = await tagsQuery

        if (tagsError) {
          console.error("Error fetching tags:", tagsError)
          return { data: [], count: 0, error: tagsError }
        }

        if (tagRecords && tagRecords.length > 0) {
          const tagIds = tagRecords.map((tag) => tag.id)
          const { data: meetingTagRecords, error: meetingTagsError } = await supabase
            .schema("ai_transcriber")
            .from("meeting_tags")
            .select("meeting_id, tag_id")
            .in('tag_id', tagIds)

          if (meetingTagsError) {
            console.error("Error fetching meeting tag data:", meetingTagsError)
            return { data: [], count: 0, error: meetingTagsError }
          }

          const tagMeetingIds = [...new Set(meetingTagRecords?.map((record) => record.meeting_id) || [])]

          if (operator === "notILike" || operator === "ne") {
            if (tagMeetingIds.length > 0) {
              excludedMeetingIds = Array.from(new Set([...excludedMeetingIds, ...tagMeetingIds]))
            }
          } else {
            meetingIds = mergeMeetingIds(meetingIds, tagMeetingIds)
          }
        } else if (operator === "notILike" || operator === "ne") {
          // No matching tags means nothing to exclude, keep existing results
        } else {
          meetingIds = mergeMeetingIds(meetingIds, [])
        }
      }
    } else if (operator === "notILike" || operator === "ne") {
      // Empty search value with negative operator -> no change
    } else {
      meetingIds = mergeMeetingIds(meetingIds, [])
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
  const shouldFilterByJoinIds = hasSpeakersFilter || hasAttendeesFilter || hasTagsFilter

  if (shouldFilterByJoinIds && Array.isArray(meetingIds)) {
    if (meetingIds.length > 0) {
      query = query.in('id', meetingIds)
    } else {
      return { data: [], count: 0, error: null }
    }
  }

  if (excludedMeetingIds.length > 0) {
    const excludedFilter = `(${excludedMeetingIds.map((id) => `"${id}"`).join(',')})`
    query = query.not('id', 'in', excludedFilter)
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
  const nonSpeakersFilters = filters.filter(filter => filter.id !== 'speakers' && filter.id !== 'attendees' && filter.id !== 'tags')
  
  nonSpeakersFilters.forEach(filter => {
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

      // Standard filtering for other columns
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
        case "gte":
          query = query.gte(columnId, normalizedValue as string | number)
          break
        case "lte":
          query = query.lte(columnId, normalizedValue as string | number)
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
