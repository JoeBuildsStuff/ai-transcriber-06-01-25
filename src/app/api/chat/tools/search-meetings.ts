import type { Anthropic } from '@anthropic-ai/sdk'
import { getMeetingsList } from '@/app/(workspace)/workspace/meetings/[id]/_lib/queries'

// Tool definition for searching meetings
export const searchMeetingsTool: Anthropic.Tool = {
  name: 'search_meetings',
  description: 'Search for meetings by participant name, date range, title, or other criteria. Use this when users ask about meetings they have had with specific people or during specific time periods.',
  input_schema: {
    type: 'object' as const,
    properties: {
      speakerName: {
        type: 'string',
        description: 'Name of a meeting speaker to search for (e.g., "john smith") - searches in meeting_speakers table'
      },
      attendeeName: {
        type: 'string',
        description: 'Name of a meeting attendee to search for (e.g., "john smith") - searches in meeting_attendees table via contacts'
      },
      participantName: {
        type: 'string',
        description: 'DEPRECATED: Use speakerName or attendeeName instead. Name of a meeting participant to search for (e.g., "john smith")'
      },
      dateFrom: {
        type: 'string',
        description: 'Start date for the search range in ISO format (e.g., "2025-01-01")'
      },
      dateTo: {
        type: 'string',
        description: 'End date for the search range in ISO format (e.g., "2025-01-31")'
      },
      title: {
        type: 'string',
        description: 'Search for meetings with a specific title or title containing certain words'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)'
      }
    },
    required: []
  }
}

// Function execution logic for the search_meetings tool
export async function executeSearchMeetings(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // Filter out client-specific parameters
    const { speakerName, attendeeName, participantName, dateFrom, dateTo, title, limit = 10 } = Object.fromEntries(
      Object.entries(parameters).filter(([key]) => 
        !['client_tz', 'client_utc_offset', 'client_now_iso'].includes(key)
      )
    )
    
    // Type-safe parameter extraction
    const speakerNameStr = typeof speakerName === 'string' ? speakerName : undefined
    const attendeeNameStr = typeof attendeeName === 'string' ? attendeeName : undefined
    const participantNameStr = typeof participantName === 'string' ? participantName : undefined
    const dateFromStr = typeof dateFrom === 'string' ? dateFrom : undefined
    const dateToStr = typeof dateTo === 'string' ? dateTo : undefined
    const titleStr = typeof title === 'string' ? title : undefined
    const limitNum = typeof limit === 'number' ? limit : 10
    
    // Build search parameters for the getMeetingsList function
    const searchParams: Record<string, string | string[] | undefined> = {
      page: '1',
      pageSize: limitNum.toString(),
      sort: 'meeting_at:desc',
      filters: JSON.stringify([])
    }
    
    // Build column filters
    const columnFilters: Array<{
      id: string;
      value: { operator: string; value: unknown };
    }> = []
    
    // Add speaker name filter if provided
    if (speakerNameStr) {
      columnFilters.push({
        id: 'speakers',
        value: {
          operator: 'iLike',
          value: speakerNameStr.toLowerCase()
        }
      })
    }
    
    // Add attendee name filter if provided
    if (attendeeNameStr) {
      columnFilters.push({
        id: 'attendees',
        value: {
          operator: 'iLike',
          value: attendeeNameStr.toLowerCase()
        }
      })
    }
    
    // Add legacy participant name filter if provided (for backward compatibility)
    if (participantNameStr && !speakerNameStr && !attendeeNameStr) {
      columnFilters.push({
        id: 'speakers',
        value: {
          operator: 'iLike',
          value: participantNameStr.toLowerCase()
        }
      })
    }
    
    // Add title filter if provided
    if (titleStr) {
      columnFilters.push({
        id: 'title',
        value: {
          operator: 'iLike',
          value: titleStr
        }
      })
    }
    
    // Add date range filters if provided
    if (dateFromStr) {
      columnFilters.push({
        id: 'meeting_at',
        value: {
          operator: 'gte',
          value: dateFromStr + 'T00:00:00.000Z' // Start of day in UTC
        }
      })
    }
    
    if (dateToStr) {
      columnFilters.push({
        id: 'meeting_at',
        value: {
          operator: 'lte',
          value: dateToStr + 'T23:59:59.999Z' // End of day in UTC
        }
      })
    }
    
    // Update the filters in searchParams
    searchParams.filters = JSON.stringify(columnFilters)
    
    const result = await getMeetingsList(searchParams)
    
    if (result.error) {
      return {
        success: false,
        error: result.error.message
      }
    }
    
    // Format the response for better readability
    const formattedMeetings = result.data.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      meeting_at: meeting.meeting_at,
      participants: meeting.speakers?.map(speaker => 
        speaker.first_name && speaker.last_name 
          ? `${speaker.first_name} ${speaker.last_name}`
          : speaker.speaker_name
      ).join(', ') || 'No participants listed',
      meeting_url: `/workspace/meetings/${meeting.id}`
    }))
    
    // Since we're now filtering at the database level with proper UTC timestamps,
    // all returned meetings should already be within the date range
    const meetingsInDateRange = formattedMeetings
    
    return {
      success: true,
      data: {
        meetings: meetingsInDateRange,
        total_count: result.count,
        search_criteria: {
          speakerName: speakerNameStr || 'Any speaker',
          attendeeName: attendeeNameStr || 'Any attendee',
          participantName: participantNameStr || 'Any participant (legacy)',
          dateFrom: dateFromStr || 'Any date',
          dateTo: dateToStr || 'Any date',
          title: titleStr || 'Any title'
        },
        debug_info: {
          total_meetings_found: result.count,
          meetings_returned: formattedMeetings.length,
          date_range_applied: !!(dateFromStr || dateToStr),
          database_filters_applied: columnFilters.length
        }
      }
    }
  } catch (error) {
    console.error('Search meetings execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
