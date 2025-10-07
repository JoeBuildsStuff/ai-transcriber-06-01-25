import type { Anthropic } from '@anthropic-ai/sdk'
import { deleteMeetings } from '@/app/(workspace)/workspace/meetings/[id]/_lib/actions'

function collectMeetingIds(parameters: Record<string, unknown>): string[] {
  const potentialKeys = ['id', 'ids', 'meeting_id', 'meeting_ids']
  const ids = new Set<string>()

  for (const key of potentialKeys) {
    const value = parameters[key]

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        ids.add(trimmed)
      }
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') {
          const trimmedEntry = entry.trim()
          if (trimmedEntry.length > 0) {
            ids.add(trimmedEntry)
          }
        }
      }
    }
  }

  return Array.from(ids)
}

export const deleteMeetingTool: Anthropic.Tool = {
  name: 'delete_meeting',
  description: 'Delete one or more meetings by their IDs. Use this after confirming the user no longer needs the meeting record.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'ID of the meeting to delete.'
      },
      ids: {
        type: 'array',
        description: 'Array of meeting IDs to delete in a single request.',
        items: { type: 'string' }
      }
    },
    required: []
  }
}

export async function executeDeleteMeeting(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const ids = collectMeetingIds(parameters)

    if (ids.length === 0) {
      return { success: false, error: 'At least one meeting ID is required to delete a meeting.' }
    }

    const result = await deleteMeetings(ids)

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to delete meetings.' }
    }

    return {
      success: true,
      data: {
        message: `Deleted ${result.deletedCount ?? ids.length} meeting(s).`,
        deleted_ids: ids,
        deleted_count: result.deletedCount ?? ids.length,
        workspace_url: '/workspace/meetings'
      }
    }
  } catch (error) {
    console.error('Delete meeting execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
