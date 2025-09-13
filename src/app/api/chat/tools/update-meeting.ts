import type { Anthropic } from '@anthropic-ai/sdk'
import { updateMeeting } from '@/app/(workspace)/workspace/meetings/[id]/_lib/actions'

// Tool definition for updating meetings
export const updateMeetingTool: Anthropic.Tool = {
  name: 'update_meeting',
  description: 'Update an existing meeting with new information such as title, meeting date/time, location.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'The unique identifier of the meeting to update'
      },
      title: {
        type: 'string',
        description: 'Updated title of the meeting'
      },
      meeting_at: {
        type: 'string',
        description: 'Updated meeting date/time in ISO format. If timezone offset is missing, use the client UTC offset.'
      },
      location: {
        type: 'string',
        description: 'Updated location of the meeting (e.g., room, Zoom, address)'
      },
      // TODO: Note: summary_jsonb and attendees edits are out of scope for this tool
    },
    required: ['id']
  }
}

// Execution function for updating meetings
export async function executeUpdateMeeting(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { id } = parameters

    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Meeting ID is required' }
    }

    // Extract and normalize fields
    let meeting_at = parameters.meeting_at as string | undefined
    const title = parameters.title as string | undefined
    const location = parameters.location as string | undefined

    // Client timezone hints injected by the API layer
    const client_utc_offset = (parameters.client_utc_offset as string) || ''

    // If meeting_at provided, ensure it has timezone info; if empty string, ignore
    if (meeting_at && String(meeting_at).trim()) {
      const hasTimezone = /[zZ]|([+-]\d{2}:?\d{2})$/.test(meeting_at)
      if (!hasTimezone && client_utc_offset) {
        meeting_at = meeting_at.replace(/[zZ]$/, '') + client_utc_offset
      }
    } else {
      meeting_at = undefined
    }

    // Build update payload with only provided fields
    const updatePayload: Record<string, unknown> = {}
    if (title !== undefined) updatePayload.title = title
    if (meeting_at !== undefined) updatePayload.meeting_at = meeting_at
    if (location !== undefined) updatePayload.location = location

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, error: 'No fields provided to update' }
    }

    const result = await updateMeeting(id, updatePayload)

    if (result.success) {
      const meeting = result.data as { id: string; title?: string; meeting_at?: string; location?: string | null }
      return {
        success: true,
        data: {
          message: 'Meeting updated successfully',
          meeting_id: meeting.id,
          title: meeting.title,
          meeting_at: meeting.meeting_at,
          location: meeting.location,
          meeting_url: `/workspace/meetings/${meeting.id}`
        }
      }
    }

    return { success: false, error: result.error || 'Failed to update meeting' }
  } catch (error) {
    console.error('Update meeting execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
