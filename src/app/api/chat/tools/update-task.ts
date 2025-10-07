import type { Anthropic } from '@anthropic-ai/sdk'
import { updateTask } from '@/app/(workspace)/workspace/tasks/_lib/actions'
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  type TaskPriority,
  type TaskStatus
} from '@/app/(workspace)/workspace/tasks/_lib/validations'

function normalizeDateTime(value: unknown, clientOffset: string): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const hasTimezone = /[zZ]|([+-]\d{2}:?\d{2})$/.test(trimmed)
  if (hasTimezone || !clientOffset) {
    return trimmed
  }
  return `${trimmed}${clientOffset}`
}

function parseIds(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const ids = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    return ids.length > 0 ? ids : []
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()]
  }
  return undefined
}

function parseStatus(value: unknown): TaskStatus | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')
    return TASK_STATUS_OPTIONS.find(option => option === normalized)
  }
  return undefined
}

function parsePriority(value: unknown): TaskPriority | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')
    return TASK_PRIORITY_OPTIONS.find(option => option === normalized)
  }
  return undefined
}

export const updateTaskTool: Anthropic.Tool = {
  name: 'update_task',
  description: 'Update an existing task with new values for title, description, status, priority, dates, owner, or associations.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'ID of the task to update.'
      },
      title: {
        type: 'string',
        description: 'New title for the task.'
      },
      description: {
        type: 'string',
        description: 'Updated description for the task.'
      },
      status: {
        type: 'string',
        description: 'Updated task status. Valid values: todo, in_progress, blocked, completed, cancelled.'
      },
      priority: {
        type: 'string',
        description: 'Updated task priority. Valid values: low, medium, high, urgent.'
      },
      start_at: {
        type: 'string',
        description: 'Updated start date/time in ISO format. Include timezone when possible.'
      },
      due_at: {
        type: 'string',
        description: 'Updated due date/time in ISO format. Include timezone when possible.'
      },
      owner_contact_id: {
        type: 'string',
        description: 'Contact ID to set as the task owner. Use an empty string to clear.'
      },
      contact_ids: {
        type: 'array',
        description: 'Optional array of contact IDs to replace existing contact associations.',
        items: { type: 'string' }
      },
      meeting_ids: {
        type: 'array',
        description: 'Optional array of meeting IDs to replace existing meeting associations.',
        items: { type: 'string' }
      },
      tag_ids: {
        type: 'array',
        description: 'Optional array of tag IDs to replace existing tag associations.',
        items: { type: 'string' }
      }
    },
    required: ['id']
  }
}

export async function executeUpdateTask(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const id = typeof parameters.id === 'string' ? parameters.id.trim() : ''
    if (!id) {
      return { success: false, error: 'Task ID is required' }
    }

    const clientOffset = typeof parameters.client_utc_offset === 'string' ? parameters.client_utc_offset : ''

    const updatePayload: Record<string, unknown> = {}

    if (typeof parameters.title === 'string') {
      const title = parameters.title.trim()
      if (title) {
        updatePayload.title = title
      }
    }

    if (typeof parameters.description === 'string') {
      updatePayload.description = parameters.description
    }

    const status = parseStatus(parameters.status)
    if (status) {
      updatePayload.status = status
    }

    const priority = parsePriority(parameters.priority)
    if (priority) {
      updatePayload.priority = priority
    }

    const start_at = normalizeDateTime(parameters.start_at, clientOffset)
    if (start_at !== undefined) {
      updatePayload.start_at = start_at
    }

    const due_at = normalizeDateTime(parameters.due_at, clientOffset)
    if (due_at !== undefined) {
      updatePayload.due_at = due_at
    }

    if (parameters.owner_contact_id === null) {
      updatePayload.owner_contact_id = null
    } else if (typeof parameters.owner_contact_id === 'string') {
      const trimmed = parameters.owner_contact_id.trim()
      updatePayload.owner_contact_id = trimmed.length > 0 ? trimmed : null
    }

    const contactIds = parseIds(parameters.contact_ids ?? parameters.contactIds)
    if (contactIds !== undefined) {
      updatePayload.contactIds = contactIds
    }

    const meetingIds = parseIds(parameters.meeting_ids ?? parameters.meetingIds)
    if (meetingIds !== undefined) {
      updatePayload.meetingIds = meetingIds
    }

    const tagIds = parseIds(parameters.tag_ids ?? parameters.tagIds)
    if (tagIds !== undefined) {
      updatePayload.tagIds = tagIds
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, error: 'No update fields provided' }
    }

    const result = await updateTask(id, updatePayload)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to update task' }
    }

    const updatedTask = result.data as { id: string; status?: string; priority?: string; due_at?: string | null }

    return {
      success: true,
      data: {
        message: 'Task updated successfully',
        task_id: updatedTask.id,
        status: updatedTask.status,
        priority: updatedTask.priority,
        due_at: updatedTask.due_at,
        task_url: `/workspace/tasks/${updatedTask.id}`
      }
    }
  } catch (error) {
    console.error('Update task tool execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
