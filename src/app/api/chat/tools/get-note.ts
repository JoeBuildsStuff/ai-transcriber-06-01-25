import type { Anthropic } from '@anthropic-ai/sdk'
import { getNoteById } from '@/app/(workspace)/workspace/notes/_lib/queries'

function resolveNoteId(parameters: Record<string, unknown>): string | undefined {
  const possibleKeys = ['note_id', 'id']

  for (const key of possibleKeys) {
    const value = parameters[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        return trimmed
      }
    }
  }

  return undefined
}

export const getNoteTool: Anthropic.Tool = {
  name: 'get_note',
  description: 'Retrieve a note by its ID, including associated contacts and meetings when available.',
  input_schema: {
    type: 'object' as const,
    properties: {
      note_id: {
        type: 'string',
        description: 'ID of the note to retrieve.'
      }
    },
    required: ['note_id']
  }
}

export async function executeGetNote(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const noteId = resolveNoteId(parameters)

    if (!noteId) {
      return { success: false, error: 'A note_id string is required to fetch a note.' }
    }

    const note = await getNoteById(noteId)

    return {
      success: true,
      data: {
        note_id: note.id,
        title: note.title,
        content: note.content,
        contacts: (note.contacts ?? []).map(contact => ({
          id: contact.id,
          first_name: contact.first_name ?? null,
          last_name: contact.last_name ?? null,
          company: contact.company?.name ?? null
        })),
        meetings: (note.meetings ?? []).map(meeting => ({
          id: meeting.id,
          title: meeting.title ?? null,
          meeting_at: meeting.meeting_at ?? null
        })),
        created_at: note.created_at,
        updated_at: note.updated_at,
        note_url: `/workspace/notes/${note.id}`
      }
    }
  } catch (error) {
    console.error('Get note tool execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
