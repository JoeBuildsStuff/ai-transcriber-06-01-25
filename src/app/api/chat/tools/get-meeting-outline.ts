import type { Anthropic } from '@anthropic-ai/sdk'
import { getMeeting } from '@/app/(workspace)/workspace/meetings/[id]/_lib/actions'

type OutlineRecord = Record<string, string>

const SECTION_ORDER = [
  'participants',
  'executive_summary',
  'discussion_outline',
  'decisions',
  'questions_asked',
  'action_items',
  'next_meeting_open_items',
] as const

const IGNORED_KEYS = new Set(['title', 'date'])

function normalizeOutline(summary: unknown): OutlineRecord | null {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return null
  }

  const normalized: OutlineRecord = {}

  for (const [key, value] of Object.entries(summary as Record<string, unknown>)) {
    if (IGNORED_KEYS.has(key)) {
      continue
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        normalized[key] = trimmed
      }
      continue
    }

    if (Array.isArray(value)) {
      const flattened = value
        .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
        .join('\n')
        .trim()

      if (flattened) {
        normalized[key] = flattened
      }
      continue
    }

    if (value !== null && typeof value === 'object') {
      const serialized = JSON.stringify(value)
      if (serialized) {
        normalized[key] = serialized
      }
      continue
    }

    if (value !== undefined && value !== null) {
      normalized[key] = String(value)
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

function orderOutlineSections(outline: OutlineRecord | null): Array<{ key: string; content: string }> {
  if (!outline) {
    return []
  }

  const entries = Object.entries(outline)

  return entries
    .sort(([keyA], [keyB]) => {
      const indexA = SECTION_ORDER.indexOf(keyA as typeof SECTION_ORDER[number])
      const indexB = SECTION_ORDER.indexOf(keyB as typeof SECTION_ORDER[number])

      if (indexA === -1 && indexB === -1) return keyA.localeCompare(keyB)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
    .map(([key, content]) => ({ key, content }))
}

export const getMeetingOutlineTool: Anthropic.Tool = {
  name: 'get_meeting_outline',
  description: 'Retrieve the structured meeting outline (summary sections) for a specific meeting. Use after identifying the meeting via search_meetings when the user asks for summaries, action items, or decisions.',
  input_schema: {
    type: 'object' as const,
    properties: {
      meeting_id: {
        type: 'string',
        description: 'The unique identifier of the meeting whose outline should be retrieved.'
      }
    },
    required: ['meeting_id']
  }
}

export async function executeGetMeetingOutline(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const meetingIdParam = parameters.meeting_id ?? parameters.meetingId

    if (!meetingIdParam || typeof meetingIdParam !== 'string') {
      return { success: false, error: 'A meeting_id string parameter is required' }
    }

    const { data: meeting, error } = await getMeeting(meetingIdParam)

    if (error) {
      console.error('Get meeting outline tool error:', error)
      return { success: false, error: error.message }
    }

    if (!meeting) {
      return { success: false, error: 'Meeting not found' }
    }

    const outline = normalizeOutline(meeting.summary_jsonb)
    const sections = orderOutlineSections(outline)

    return {
      success: true,
      data: {
        meeting_id: meeting.id,
        meeting_title: meeting.title ?? 'Untitled Meeting',
        meeting_at: meeting.meeting_at ?? null,
        outline_available: sections.length > 0,
        outline_sections: sections,
        outline,
        meeting_url: `/workspace/meetings/${meeting.id}`
      }
    }
  } catch (error) {
    console.error('Execute get meeting outline error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
