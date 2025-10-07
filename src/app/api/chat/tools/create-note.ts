import type { Anthropic } from '@anthropic-ai/sdk'
import { createNote } from '@/app/(workspace)/workspace/notes/_lib/actions'

function coerceTitle(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function collectIds(parameters: Record<string, unknown>, keys: string[]): string[] | undefined {
  const ids = new Set<string>()

  keys.forEach(key => {
    const value = parameters[key]

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        ids.add(trimmed)
      }
    }

    if (Array.isArray(value)) {
      value.forEach(entry => {
        if (typeof entry === 'string') {
          const trimmedEntry = entry.trim()
          if (trimmedEntry) {
            ids.add(trimmedEntry)
          }
        }
      })
    }
  })

  if (ids.size === 0) {
    return undefined
  }

  return Array.from(ids)
}

export const createNoteTool: Anthropic.Tool = {
  name: 'create_note',
  description: 'Create a new note with optional title and associations to contacts or meetings.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Optional title for the note.'
      },
      content: {
        type: 'string',
        description: 'Body content of the note. Provide the full note text here.'
      },
      contact_ids: {
        type: 'array',
        description: 'Optional array of contact IDs to associate with this note.',
        items: { type: 'string' }
      },
      meeting_ids: {
        type: 'array',
        description: 'Optional array of meeting IDs to associate with this note.',
        items: { type: 'string' }
      }
    },
    required: ['content']
  }
}

export async function executeCreateNote(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const contentInput = typeof parameters.content === 'string' ? parameters.content : undefined
    const content = contentInput && contentInput.trim().length > 0 ? contentInput : undefined

    if (!content) {
      return { success: false, error: 'Note content is required to create a note.' }
    }

    const title = coerceTitle(parameters.title)

    const contactIds = collectIds(parameters, ['contact_ids', 'contactIds', 'contacts'])
    const meetingIds = collectIds(parameters, ['meeting_ids', 'meetingIds', 'meetings'])

    const payload: Record<string, unknown> = {
      title,
      content,
      contactIds,
      meetingIds
    }

    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key]
      }
    })

    const result = await createNote(payload)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to create note.' }
    }

    const createdNote = result.data as { id: string; title?: string | null }

    return {
      success: true,
      data: {
        message: 'Note created successfully.',
        note_id: createdNote.id,
        note_title: createdNote.title ?? title ?? null,
        note_url: `/workspace/notes/${createdNote.id}`
      }
    }
  } catch (error) {
    console.error('Create note tool execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
