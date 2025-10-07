import type { Anthropic } from '@anthropic-ai/sdk'
import { deletePersons } from '@/app/(workspace)/workspace/contacts/_lib/actions'

function collectContactIds(parameters: Record<string, unknown>): string[] {
  const potentialKeys = ['id', 'ids', 'contact_id', 'contact_ids', 'person_id', 'person_ids']
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

export const deletePersonTool: Anthropic.Tool = {
  name: 'delete_person_contact',
  description: 'Delete one or more person contacts by their IDs. Use this when a contact should be permanently removed.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'ID of the person contact to delete. Accepts a single ID when removing one contact.'
      },
      ids: {
        type: 'array',
        description: 'Array of person contact IDs to delete in bulk.',
        items: { type: 'string' }
      }
    },
    required: []
  }
}

export async function executeDeletePersonContact(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const ids = collectContactIds(parameters)

    if (ids.length === 0) {
      return { success: false, error: 'At least one contact ID is required to delete a contact.' }
    }

    const result = await deletePersons(ids)

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to delete contacts.' }
    }

    return {
      success: true,
      data: {
        message: `Deleted ${result.deletedCount ?? ids.length} contact(s).`,
        deleted_ids: ids,
        deleted_count: result.deletedCount ?? ids.length,
        workspace_url: '/workspace/contacts'
      }
    }
  } catch (error) {
    console.error('Delete person contact execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
