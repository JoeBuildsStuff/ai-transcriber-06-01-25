import type { Anthropic } from '@anthropic-ai/sdk'
import { updateMeeting } from '@/app/(workspace)/workspace/meetings/[id]/_lib/actions'
import { attachExistingTagsToMeeting } from '@/actions/meetings'
import type { TagAttachmentSummary } from '@/actions/meetings'

// Tool definition for updating meetings
export const updateMeetingTool: Anthropic.Tool = {
  name: 'update_meeting',
  description: 'Update an existing meeting with new information such as title, meeting date/time, location, and tags. Provide tag names to attach existing tags; missing tags will be reported so you can ask the user to clarify or create them.',
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
      meeting_end_at: {
        type: 'string',
        description: 'Updated meeting end date/time in ISO format. If timezone offset is missing, use the client UTC offset.'
      },
      location: {
        type: 'string',
        description: 'Updated location of the meeting (e.g., room, Zoom, address)'
      },
      tags: {
        type: 'array',
        description: 'Optional list of existing tag names to attach to the meeting. Tags that do not exist will be reported back to you so you can follow up with the user.',
        items: {
          type: 'string'
        }
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
    let meeting_end_at = parameters.meeting_end_at as string | undefined
    const title = parameters.title as string | undefined
    const location = parameters.location as string | undefined
    const rawTags = parameters.tags
    const tags = Array.isArray(rawTags) ? rawTags.map(tag => String(tag)) : undefined

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

    // If meeting_end_at provided, ensure it has timezone info; if empty string, ignore
    if (meeting_end_at && String(meeting_end_at).trim()) {
      const hasTimezone = /[zZ]|([+-]\d{2}:?\d{2})$/.test(meeting_end_at)
      if (!hasTimezone && client_utc_offset) {
        meeting_end_at = meeting_end_at.replace(/[zZ]$/, '') + client_utc_offset
      }
    } else {
      meeting_end_at = undefined
    }

    // Build update payload with only provided fields
    const updatePayload: Record<string, unknown> = {}
    if (title !== undefined) updatePayload.title = title
    if (meeting_at !== undefined) updatePayload.meeting_at = meeting_at
    if (meeting_end_at !== undefined) updatePayload.meeting_end_at = meeting_end_at
    if (location !== undefined) updatePayload.location = location

    const hasMeetingFieldUpdates = Object.keys(updatePayload).length > 0
    const hasTagUpdates = Array.isArray(tags) && tags.length > 0

    if (!hasMeetingFieldUpdates && !hasTagUpdates) {
      return { success: false, error: 'No fields provided to update' }
    }

    let meeting: { id: string; title?: string; meeting_at?: string; meeting_end_at?: string; location?: string | null } | undefined

    if (hasMeetingFieldUpdates) {
      const result = await updateMeeting(id, updatePayload)

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to update meeting' }
      }

      meeting = result.data as { id: string; title?: string; meeting_at?: string; meeting_end_at?: string; location?: string | null }
    }

    let tagSummaryData: TagAttachmentSummary | undefined
    if (hasTagUpdates) {
      tagSummaryData = await attachExistingTagsToMeeting(id, tags ?? [])
    }

    const attachedTagNames = tagSummaryData ? tagSummaryData.attached.map(tag => tag.name) : []
    const missingTagNames = tagSummaryData?.missing ?? []
    const tagSummaryParts: string[] = []

    if (attachedTagNames.length > 0) {
      tagSummaryParts.push(`Attached ${attachedTagNames.length} tag(s): ${attachedTagNames.join(', ')}`)
    }

    if (missingTagNames.length > 0) {
      tagSummaryParts.push(`Could not find ${missingTagNames.length} tag(s): ${missingTagNames.join(', ')}`)
    }

    if (tagSummaryData?.error) {
      tagSummaryParts.push(`Tag attachment error: ${tagSummaryData.error}`)
    }

    const tagsSummary = hasTagUpdates ? (tagSummaryParts.join('. ') || 'No tags were attached') : 'No tags requested'

    const messageParts: string[] = []
    if (hasMeetingFieldUpdates) {
      messageParts.push('Meeting fields updated')
    }
    if (hasTagUpdates) {
      messageParts.push(tagsSummary)
    }

    const responseMessage = messageParts.join('. ') || 'No changes applied'

    return {
      success: true,
      data: {
        message: responseMessage,
        meeting_id: meeting?.id ?? id,
        title: meeting?.title,
        meeting_at: meeting?.meeting_at,
        meeting_end_at: meeting?.meeting_end_at,
        location: meeting?.location,
        meeting_url: `/workspace/meetings/${id}`,
        tags_summary: tagsSummary,
        tags_attached: attachedTagNames,
        tags_missing: missingTagNames,
        tags_error: tagSummaryData?.error ?? null
      }
    }
  } catch (error) {
    console.error('Update meeting execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
