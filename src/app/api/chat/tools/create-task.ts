import type { Anthropic } from '@anthropic-ai/sdk'
import { createTask } from '@/app/(workspace)/workspace/tasks/_lib/actions'
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
    return ids.length > 0 ? ids : undefined
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()]
  }
  return undefined
}

function parseStatus(value: unknown): TaskStatus | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')
    const match = TASK_STATUS_OPTIONS.find(option => option === normalized)
    if (match) {
      return match
    }
  }
  return undefined
}

function parsePriority(value: unknown): TaskPriority | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')
    const match = TASK_PRIORITY_OPTIONS.find(option => option === normalized)
    if (match) {
      return match
    }
  }
  return undefined
}

export const createTaskTool: Anthropic.Tool = {
  name: 'create_task',
  description: 'Create a new task with title, description, status, priority, dates, owner, and optional associations to contacts, meetings, and tags.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'Title for the task.'
      },
      description: {
        type: 'string',
        description: 'Optional detailed description of the task.'
      },
      status: {
        type: 'string',
        description: 'Task status. Valid values: todo, in_progress, blocked, completed, cancelled. Defaults to todo.'
      },
      priority: {
        type: 'string',
        description: 'Task priority. Valid values: low, medium, high, urgent. Defaults to medium.'
      },
      start_at: {
        type: 'string',
        description: 'Optional start date/time in ISO format. Include timezone when possible.'
      },
      due_at: {
        type: 'string',
        description: 'Optional due date/time in ISO format. Include timezone when possible.'
      },
      owner_contact_id: {
        type: 'string',
        description: 'Optional contact ID to assign as the task owner.'
      },
      contact_ids: {
        type: 'array',
        description: 'Optional array of contact IDs to associate with the task.',
        items: { type: 'string' }
      },
      meeting_ids: {
        type: 'array',
        description: 'Optional array of meeting IDs to associate with the task.',
        items: { type: 'string' }
      },
      tag_ids: {
        type: 'array',
        description: 'Optional array of tag IDs to associate with the task.',
        items: { type: 'string' }
      }
    },
    required: ['title']
  }
}

export async function executeCreateTask(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const title = typeof parameters.title === 'string' ? parameters.title.trim() : ''
    if (!title) {
      return { success: false, error: 'Task title is required' }
    }

    const clientOffset = typeof parameters.client_utc_offset === 'string' ? parameters.client_utc_offset : ''

    const status = parseStatus(parameters.status) ?? 'todo'
    const priority = parsePriority(parameters.priority) ?? 'medium'

    const description = typeof parameters.description === 'string' ? parameters.description : undefined
    const start_at = normalizeDateTime(parameters.start_at, clientOffset)
    const due_at = normalizeDateTime(parameters.due_at, clientOffset)

    let owner_contact_id: string | null | undefined
    if (parameters.owner_contact_id === null) {
      owner_contact_id = null
    } else if (typeof parameters.owner_contact_id === 'string') {
      const trimmed = parameters.owner_contact_id.trim()
      owner_contact_id = trimmed.length > 0 ? trimmed : null
    }

    const contactIds = parseIds(parameters.contact_ids ?? parameters.contactIds)
    const meetingIds = parseIds(parameters.meeting_ids ?? parameters.meetingIds)
    const tagIds = parseIds(parameters.tag_ids ?? parameters.tagIds)

    const payload: Record<string, unknown> = {
      title,
      description,
      status,
      priority,
      start_at,
      due_at,
      owner_contact_id,
      contactIds,
      meetingIds,
      tagIds
    }

    // Remove undefined fields to avoid accidental overwrites
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key]
      }
    })

    const result = await createTask(payload)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to create task' }
    }

    const createdTask = result.data as { id: string }

    return {
      success: true,
      data: {
        message: 'Task created successfully',
        task_id: createdTask.id,
        task_url: `/workspace/tasks/${createdTask.id}`,
        status,
        priority,
        due_at,
        owner_contact_id
      }
    }
  } catch (error) {
    console.error('Create task tool execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
