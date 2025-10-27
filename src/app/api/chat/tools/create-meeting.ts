import type { Anthropic } from '@anthropic-ai/sdk'
import { createMeeting } from '@/actions/meetings'

// Tool definition
export const createMeetingTool: Anthropic.Tool = {
  name: 'create_meeting',
  description: 'Creates a new meeting with title, meeting date/time, location, description, and participants. When processing meeting invitations or calendar events from images, extract the meeting body/description content as the description parameter and any attendees/participants as the participants array. This creates a meeting that can be populated with audio files, attendees, and other details later.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Title for the meeting (optional, defaults to "Untitled Meeting")'
      },
      meeting_at: {
        type: 'string',
        description: 'Date and time for the meeting in ISO format with timezone information (optional, defaults to current time). For example: "2025-08-26T09:30:00-07:00" for Pacific Time. Always include timezone offset when available from the meeting invitation.'
      },
      meeting_end_at: {
        type: 'string',
        description: 'End date and time for the meeting in ISO format with timezone information (optional). For example: "2025-08-26T10:30:00-07:00" for Pacific Time. Always include timezone offset when available from the meeting invitation.'
      },
      location: {
        type: 'string',
        description: 'Location of the meeting (optional, e.g., "Conference Room A", "Zoom Meeting", "123 Main St", "Zoom Meeting ID: 123 456 7890")'
      },
      description: {
        type: 'string',
        description: 'The meeting description, body content, or notes from the meeting invitation. This should include the actual meeting content, agenda, or notes that appear in the meeting body/description area of calendar invitations, not just logistical details. For example, if the meeting invitation contains personal messages, agenda items, or meeting notes, include those here.'
      },
      participants: {
        type: 'array',
        description: 'Array of meeting participants extracted from the invitation. Each participant should have firstName and lastName fields. For example, if an Outlook invitation shows "Taylor, Joe" in the Required field, extract as {firstName: "Joe", lastName: "Taylor"}.',
        items: {
          type: 'object',
          properties: {
            firstName: {
              type: 'string',
              description: 'First name of the participant'
            },
            lastName: {
              type: 'string',
              description: 'Last name of the participant'
            }
          },
          required: ['firstName', 'lastName']
        }
      }
    },
    required: [] // All parameters are optional
  }
}

// Execution function
export async function executeCreateMeeting(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // Extract parameters from the LLM request
    const title = parameters.title as string | undefined
    let meeting_at = parameters.meeting_at as string | undefined
    let meeting_end_at = parameters.meeting_end_at as string | undefined
    const location = parameters.location as string | undefined
    const description = parameters.description as string | undefined
    const participants = parameters.participants as Array<{ firstName: string; lastName: string }> | undefined
    
    // Client timezone hints injected by the API layer
    const client_utc_offset = (parameters.client_utc_offset as string) || ''
    const client_now_iso = (parameters.client_now_iso as string) || ''

    // If meeting_at is missing, fall back to client's current local ISO (includes offset)
    if (!meeting_at || !String(meeting_at).trim()) {
      meeting_at = client_now_iso || undefined
    } else {
      // If provided value lacks timezone info, append client's UTC offset if available
      const hasTimezone = /[zZ]|([+-]\d{2}:?\d{2})$/.test(meeting_at)
      if (!hasTimezone && client_utc_offset) {
        // Normalize to "YYYY-MM-DDTHH:mm[:ss][.sss]" + offset
        // If meeting_at already has a trailing 'Z', remove (handled by hasTimezone check, but safe)
        meeting_at = meeting_at.replace(/[zZ]$/, '') + client_utc_offset
      }
    }

    // Handle meeting_end_at timezone if provided
    if (meeting_end_at && String(meeting_end_at).trim()) {
      const hasTimezone = /[zZ]|([+-]\d{2}:?\d{2})$/.test(meeting_end_at)
      if (!hasTimezone && client_utc_offset) {
        meeting_end_at = meeting_end_at.replace(/[zZ]$/, '') + client_utc_offset
      }
    }
    
    // Call the enhanced createMeeting action with parameters
    const result = await createMeeting({
      title,
      meeting_at,
      meeting_end_at,
      location,
      description,
      participants
    })
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    if (result.meeting) {
      // Build participant summary
      let participantSummary = ''
      if (result.participants && result.participants.length > 0) {
        const foundParticipants = result.participants.filter(p => p.found)
        const notFoundParticipants = result.participants.filter(p => !p.found)
        
        if (foundParticipants.length > 0) {
          participantSummary += `Found and added ${foundParticipants.length} participant(s): ${foundParticipants.map(p => p.name).join(', ')}. `
        }
        
        if (notFoundParticipants.length > 0) {
          participantSummary += `Could not find ${notFoundParticipants.length} participant(s) in contacts: ${notFoundParticipants.map(p => p.name).join(', ')}. `
        }
      }
      
      return { 
        success: true, 
        data: {
          message: "Meeting created successfully",
          meeting_id: result.meeting.id,
          meeting_url: `/workspace/meetings/${result.meeting.id}`,
          note_id: result.note?.id,
          title: result.meeting.title,
          meeting_at: result.meeting.meeting_at,
          meeting_end_at: result.meeting.meeting_end_at,
          location: result.meeting.location,
          participants_summary: participantSummary || "No participants specified"
        }
      }
    }
    
    return { success: false, error: 'Failed to create meeting' }
  } catch (error) {
    console.error('Create meeting tool execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
