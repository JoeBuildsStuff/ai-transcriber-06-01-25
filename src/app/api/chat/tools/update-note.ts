import type { Anthropic } from '@anthropic-ai/sdk'
import { updateNote } from '@/app/(workspace)/workspace/notes/_lib/actions'

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

function normalizeTitle(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  return undefined
}

function normalizeContent(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return null
    }
    return value
  }

  return undefined
}

function collectIdsForUpdate(parameters: Record<string, unknown>, keys: string[]): string[] | undefined {
  let encountered = false
  const ids = new Set<string>()

  keys.forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(parameters, key)) {
      return
    }

    encountered = true
    const value = parameters[key]

    if (value === null) {
      return
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        ids.add(trimmed)
      }
      return
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

  if (!encountered) {
    return undefined
  }

  return Array.from(ids)
}

export const updateNoteTool: Anthropic.Tool = {
  name: 'update_note',
  description: 'Update an existing note. You can modify the title, content, and replace contact or meeting associations.',
  input_schema: {
    type: 'object' as const,
    properties: {
      note_id: {
        type: 'string',
        description: 'ID of the note to update.'
      },
      title: {
        type: 'string',
        description: 'Updated title for the note. Provide an empty string to clear the title.'
      },
      content: {
        type: 'string',
        description: 'Updated body content for the note. Provide an empty string to clear the content.'
      },
      contact_ids: {
        type: 'array',
        description: 'Array of contact IDs to replace existing associations. Use an empty array to remove all.',
        items: { type: 'string' }
      },
      meeting_ids: {
        type: 'array',
        description: 'Array of meeting IDs to replace existing associations. Use an empty array to remove all.',
        items: { type: 'string' }
      }
    },
    required: ['note_id']
  }
}

export async function executeUpdateNote(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const noteId = resolveNoteId(parameters)

    if (!noteId) {
      return { success: false, error: 'A note_id string is required to update a note.' }
    }

    const updatePayload: Record<string, unknown> = {}

    if (Object.prototype.hasOwnProperty.call(parameters, 'title')) {
      const title = normalizeTitle(parameters.title)
      if (title !== undefined) {
        updatePayload.title = title
      }
    }

    if (Object.prototype.hasOwnProperty.call(parameters, 'content')) {
      const content = normalizeContent(parameters.content)
      if (content !== undefined) {
        updatePayload.content = content
      }
    }

    const contactIds = collectIdsForUpdate(parameters, ['contact_ids', 'contactIds', 'contacts'])
    if (contactIds !== undefined) {
      updatePayload.contactIds = contactIds
    }

    const meetingIds = collectIdsForUpdate(parameters, ['meeting_ids', 'meetingIds', 'meetings'])
    if (meetingIds !== undefined) {
      updatePayload.meetingIds = meetingIds
    }

    const meaningfulKeys = Object.keys(updatePayload).filter(key => updatePayload[key] !== undefined)

    if (meaningfulKeys.length === 0) {
      return { success: false, error: 'No valid update fields were provided.' }
    }

    const result = await updateNote(noteId, updatePayload)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to update note.' }
    }

    const updatedNote = result.data as { id: string; title?: string | null; content?: string | null }

    return {
      success: true,
      data: {
        message: 'Note updated successfully.',
        note_id: updatedNote.id,
        note_title: updatedNote.title ?? null,
        note_content: updatedNote.content ?? null,
        note_url: `/workspace/notes/${updatedNote.id}`
      }
    }
  } catch (error) {
    console.error('Update note tool execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
