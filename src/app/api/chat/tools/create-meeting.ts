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
        description: 'Date and time for the meeting in ISO format (optional, defaults to current time)'
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
    const meeting_at = parameters.meeting_at as string | undefined
    const location = parameters.location as string | undefined
    const description = parameters.description as string | undefined
    const participants = parameters.participants as Array<{ firstName: string; lastName: string }> | undefined
    
    // Call the enhanced createMeeting action with parameters
    const result = await createMeeting({
      title,
      meeting_at,
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
