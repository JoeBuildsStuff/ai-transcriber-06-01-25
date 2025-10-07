import type { Anthropic } from '@anthropic-ai/sdk'
import { deleteTasks } from '@/app/(workspace)/workspace/tasks/_lib/actions'

function collectTaskIds(parameters: Record<string, unknown>): string[] {
  const potentialKeys = ['id', 'ids', 'task_id', 'task_ids']
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

export const deleteTaskTool: Anthropic.Tool = {
  name: 'delete_task',
  description: 'Delete one or more tasks by their IDs. Use this when a task should be permanently removed from the workspace.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'ID of the task to delete.'
      },
      ids: {
        type: 'array',
        description: 'Array of task IDs to delete.',
        items: { type: 'string' }
      }
    },
    required: []
  }
}

export async function executeDeleteTask(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const ids = collectTaskIds(parameters)

    if (ids.length === 0) {
      return { success: false, error: 'At least one task ID is required to delete a task.' }
    }

    const result = await deleteTasks(ids)

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to delete tasks.' }
    }

    return {
      success: true,
      data: {
        message: `Deleted ${result.deletedCount ?? ids.length} task(s).`,
        deleted_ids: ids,
        deleted_count: result.deletedCount ?? ids.length,
        workspace_url: '/workspace/tasks'
      }
    }
  } catch (error) {
    console.error('Delete task execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
