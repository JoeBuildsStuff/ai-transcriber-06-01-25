import type { Anthropic } from '@anthropic-ai/sdk'
import { getTasks } from '@/app/(workspace)/workspace/tasks/_lib/queries'
import type { TaskWithAssociations } from '@/app/(workspace)/workspace/tasks/_lib/validations'

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

function normalizeDateBoundary(value: unknown, clientOffset: string, boundary: 'start' | 'end'): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return boundary === 'start'
      ? `${trimmed}T00:00:00.000Z`
      : `${trimmed}T23:59:59.999Z`
  }
  return normalizeDateTime(trimmed, clientOffset)
}

const SORTABLE_COLUMNS = new Set(['due_at', 'created_at', 'updated_at', 'priority', 'status'])

export const searchTasksTool: Anthropic.Tool = {
  name: 'search_tasks',
  description: 'Search for tasks by title keywords, status, priority, owner, or due date ranges.',
  input_schema: {
    type: 'object' as const,
    properties: {
      search_term: {
        type: 'string',
        description: 'General keyword search for the task title.'
      },
      title: {
        type: 'string',
        description: 'Specific keyword search against the task title.'
      },
      status: {
        type: 'string',
        description: 'Filter by task status (todo, in_progress, blocked, completed, cancelled).'
      },
      priority: {
        type: 'string',
        description: 'Filter by task priority (low, medium, high, urgent).'
      },
      owner_contact_id: {
        type: 'string',
        description: 'Filter tasks assigned to a specific owner contact ID.'
      },
      due_after: {
        type: 'string',
        description: 'Return tasks due on or after this date (ISO string or YYYY-MM-DD).'
      },
      due_before: {
        type: 'string',
        description: 'Return tasks due on or before this date (ISO string or YYYY-MM-DD).'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of tasks to return (default 10, max 50).'
      },
      sort_by: {
        type: 'string',
        description: 'Column to sort by (due_at, created_at, updated_at, priority, status). Defaults to due_at.'
      },
      sort_direction: {
        type: 'string',
        description: 'Sort direction: asc or desc. Defaults to asc.'
      }
    },
    required: []
  }
}

export async function executeSearchTasks(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const clientOffset = typeof parameters.client_utc_offset === 'string' ? parameters.client_utc_offset : ''

    const limitRaw = parameters.limit
    let limit = 10
    if (typeof limitRaw === 'number' && Number.isFinite(limitRaw)) {
      limit = Math.min(Math.max(Math.round(limitRaw), 1), 50)
    } else if (typeof limitRaw === 'string' && limitRaw.trim()) {
      const parsed = Number.parseInt(limitRaw, 10)
      if (!Number.isNaN(parsed)) {
        limit = Math.min(Math.max(parsed, 1), 50)
      }
    }

    const sortByRaw = typeof parameters.sort_by === 'string' ? parameters.sort_by : typeof parameters.sortBy === 'string' ? parameters.sortBy : undefined
    const sortBy = sortByRaw && SORTABLE_COLUMNS.has(sortByRaw) ? sortByRaw : 'due_at'

    const sortDirectionRaw = typeof parameters.sort_direction === 'string' ? parameters.sort_direction : typeof parameters.sortDirection === 'string' ? parameters.sortDirection : undefined
    const sortDirection = sortDirectionRaw === 'desc' ? 'desc' : 'asc'

    const columnFilters: Array<{
      id: string
      value: { operator: string; value: unknown }
    }> = []

    const searchTerm = typeof parameters.search_term === 'string'
      ? parameters.search_term
      : typeof parameters.searchTerm === 'string'
        ? parameters.searchTerm
        : undefined

    const titleTerm = typeof parameters.title === 'string' ? parameters.title : undefined
    const status = typeof parameters.status === 'string' ? parameters.status : undefined
    const priority = typeof parameters.priority === 'string' ? parameters.priority : undefined
    const ownerContactId = typeof parameters.owner_contact_id === 'string'
      ? parameters.owner_contact_id
      : typeof parameters.ownerContactId === 'string'
        ? parameters.ownerContactId
        : undefined
    const dueAfter = normalizeDateBoundary(parameters.due_after ?? parameters.dueAfter, clientOffset, 'start')
    const dueBefore = normalizeDateBoundary(parameters.due_before ?? parameters.dueBefore, clientOffset, 'end')

    const titleSearch = titleTerm ?? searchTerm
    if (titleSearch) {
      columnFilters.push({
        id: 'title',
        value: {
          operator: 'iLike',
          value: titleSearch
        }
      })
    }

    if (status) {
      columnFilters.push({
        id: 'status',
        value: {
          operator: 'eq',
          value: status
        }
      })
    }

    if (priority) {
      columnFilters.push({
        id: 'priority',
        value: {
          operator: 'eq',
          value: priority
        }
      })
    }

    if (ownerContactId) {
      columnFilters.push({
        id: 'owner_contact_id',
        value: {
          operator: 'eq',
          value: ownerContactId
        }
      })
    }

    if (dueAfter) {
      columnFilters.push({
        id: 'due_at',
        value: {
          operator: 'gte',
          value: dueAfter
        }
      })
    }

    if (dueBefore) {
      columnFilters.push({
        id: 'due_at',
        value: {
          operator: 'lte',
          value: dueBefore
        }
      })
    }

    const searchParams: Record<string, string | string[] | undefined> = {
      page: '1',
      pageSize: limit.toString(),
      sort: `${sortBy}:${sortDirection}`,
      filters: JSON.stringify(columnFilters)
    }

    const result = await getTasks(searchParams)

    if (result.error) {
      return {
        success: false,
        error: result.error.message
      }
    }

    const tasks = (result.data ?? []).slice(0, limit) as TaskWithAssociations[]

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      start_at: task.start_at,
      due_at: task.due_at,
      owner: task.owner,
      contacts: task.contacts,
      meetings: task.meetings,
      tags: task.tags,
      task_url: `/workspace/tasks/${task.id}`
    }))

    return {
      success: true,
      data: {
        tasks: formattedTasks,
        total_count: result.count,
        applied_filters: {
          search_term: titleSearch || null,
          status: status || null,
          priority: priority || null,
          owner_contact_id: ownerContactId || null,
          due_after: dueAfter || null,
          due_before: dueBefore || null,
          sort_by: sortBy,
          sort_direction: sortDirection,
          limit
        }
      }
    }
  } catch (error) {
    console.error('Search tasks tool execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
