import type { Anthropic } from '@anthropic-ai/sdk'
import { deleteNotes } from '@/app/(workspace)/workspace/notes/_lib/actions'

function collectNoteIds(parameters: Record<string, unknown>): string[] {
  const potentialKeys = ['note_id', 'note_ids', 'id', 'ids']
  const ids = new Set<string>()

  potentialKeys.forEach(key => {
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

  return Array.from(ids)
}

export const deleteNoteTool: Anthropic.Tool = {
  name: 'delete_note',
  description: 'Delete one or more notes by their IDs.',
  input_schema: {
    type: 'object' as const,
    properties: {
      note_id: {
        type: 'string',
        description: 'ID of the note to delete.'
      },
      note_ids: {
        type: 'array',
        description: 'Array of note IDs to delete.',
        items: { type: 'string' }
      }
    },
    required: []
  }
}

export async function executeDeleteNote(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const ids = collectNoteIds(parameters)

    if (ids.length === 0) {
      return { success: false, error: 'At least one note ID is required to delete a note.' }
    }

    const result = await deleteNotes(ids)

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to delete notes.' }
    }

    return {
      success: true,
      data: {
        message: `Deleted ${result.deletedCount ?? ids.length} note(s).`,
        deleted_ids: ids,
        deleted_count: result.deletedCount ?? ids.length,
        workspace_url: '/workspace/notes'
      }
    }
  } catch (error) {
    console.error('Delete note tool execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
