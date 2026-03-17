import type { Anthropic } from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import {
  listThreads,
  createThread,
  createComment,
} from '@/components/tiptap/lib/comments'

const MAX_THREADS = 200
const MAX_COMMENT_CHARS = 4000

type ToolResult = Promise<{ success: boolean; data?: unknown; error?: string }>

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asPositiveInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1)
    return null
  return value
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function truncateText(
  value: string,
  maxChars: number
): { text: string; truncated: boolean } {
  if (value.length <= maxChars) return { text: value, truncated: false }
  return { text: value.slice(0, maxChars), truncated: true }
}

function stripHtml(content: string): string {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function noteUrl(noteId: string): string {
  return `/workspace/notes/${encodeURIComponent(noteId)}`
}

async function getAuthenticatedContext(): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: 'Unauthorized' }
  }

  return { supabase, userId: user.id }
}

async function getOwnedNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  noteId: string
): Promise<{ id: string; title: string | null; content: string | null } | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content')
    .eq('id', noteId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data as { id: string; title: string | null; content: string | null }
}

export const notesGetCommentsTool: Anthropic.Tool = {
  name: 'notes_get_comments',
  description:
    'Retrieve comment threads for a note, including replies and resolved/unresolved status.',
  input_schema: {
    type: 'object' as const,
    properties: {
      noteId: {
        type: 'string',
        description: 'Note ID (the value in /workspace/notes/{noteId}).',
      },
      includeResolved: {
        type: 'boolean',
        description: 'Include resolved threads. Defaults to true.',
      },
      limitThreads: {
        type: 'integer',
        description: `Maximum number of threads to return (1-${MAX_THREADS}). Defaults to 50.`,
      },
      maxCharsPerComment: {
        type: 'integer',
        description: `Maximum comment content size in chars per comment (1-${MAX_COMMENT_CHARS}). Defaults to ${MAX_COMMENT_CHARS}.`,
      },
    },
    required: ['noteId'],
  },
}

export async function executeNotesGetComments(
  parameters: Record<string, unknown>
): ToolResult {
  try {
    const noteId = asString(parameters.noteId)
    if (!noteId) {
      return { success: false, error: 'noteId is required' }
    }

    const includeResolved =
      typeof parameters.includeResolved === 'boolean'
        ? parameters.includeResolved
        : true
    const limitThreads = clamp(
      asPositiveInteger(parameters.limitThreads) ?? 50,
      1,
      MAX_THREADS
    )
    const maxCharsPerComment = clamp(
      asPositiveInteger(parameters.maxCharsPerComment) ?? MAX_COMMENT_CHARS,
      1,
      MAX_COMMENT_CHARS
    )

    const auth = await getAuthenticatedContext()
    if ('error' in auth) {
      return { success: false, error: auth.error }
    }

    const note = await getOwnedNote(auth.supabase, auth.userId, noteId)
    if (!note) {
      return { success: false, error: 'Note not found' }
    }

    const allThreads = await listThreads(noteId, auth.userId)
    const filteredThreads = includeResolved
      ? allThreads
      : allThreads.filter((t) => t.status === 'unresolved')

    const threads = filteredThreads.slice(0, limitThreads).map((thread) => ({
      id: thread.id,
      status: thread.status,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      resolvedAt: thread.resolvedAt,
      anchor: {
        from: thread.anchorFrom,
        to: thread.anchorTo,
        exact: thread.anchorExact,
      },
      comments: thread.comments.map((comment) => {
        const { text, truncated } = truncateText(
          comment.content,
          maxCharsPerComment
        )
        return {
          id: comment.id,
          userId: comment.userId,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          content: text,
          truncated,
          ...(truncated ? { originalLength: comment.content.length } : {}),
        }
      }),
    }))

    const totalComments = filteredThreads.reduce(
      (sum, t) => sum + t.comments.length,
      0
    )

    return {
      success: true,
      data: {
        noteId,
        noteTitle: note.title ?? 'Untitled',
        includeResolved,
        totalThreads: filteredThreads.length,
        totalComments,
        returnedThreads: threads.length,
        threads,
        url: noteUrl(noteId),
      },
    }
  } catch (error) {
    console.error('notes_get_comments execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export const notesAddCommentTool: Anthropic.Tool = {
  name: 'notes_add_comment',
  description:
    'Create a new comment thread on a note. This starts a top-level comment (not a reply).',
  input_schema: {
    type: 'object' as const,
    properties: {
      noteId: {
        type: 'string',
        description: 'Note ID (the value in /workspace/notes/{noteId}).',
      },
      content: {
        type: 'string',
        description: 'Comment content for the new thread.',
      },
      anchorText: {
        type: 'string',
        description: 'Optional explicit anchor text to attach the thread to.',
      },
    },
    required: ['noteId', 'content'],
  },
}

export async function executeNotesAddComment(
  parameters: Record<string, unknown>
): ToolResult {
  try {
    const noteId = asString(parameters.noteId)
    const content = asString(parameters.content)

    if (!noteId) return { success: false, error: 'noteId is required' }
    if (!content) return { success: false, error: 'content is required' }

    const auth = await getAuthenticatedContext()
    if ('error' in auth) return { success: false, error: auth.error }

    const note = await getOwnedNote(auth.supabase, auth.userId, noteId)
    if (!note) return { success: false, error: 'Note not found' }

    const plainNote = stripHtml(note.content ?? '')
    const anchorFrom = 1
    const inferredAnchorText =
      asString(parameters.anchorText) ?? plainNote.slice(0, 120)
    const safeAnchorText = inferredAnchorText || 'Note comment'
    const anchorTo = Math.max(
      2,
      Math.min(anchorFrom + safeAnchorText.length, plainNote.length + 1 || 2)
    )
    const anchorPrefix = ''
    const anchorSuffix = plainNote.slice(
      Math.max(0, anchorTo - 1),
      Math.max(0, anchorTo - 1 + 48)
    )

    const thread = await createThread({
      documentId: noteId,
      userId: auth.userId,
      anchorFrom,
      anchorTo,
      anchorExact: safeAnchorText,
      anchorPrefix,
      anchorSuffix,
      content,
    })

    const rootComment = thread.comments[0]

    return {
      success: true,
      data: {
        noteId,
        threadId: thread.id,
        rootCommentId: rootComment?.id ?? null,
        threadStatus: thread.status,
        createdAt: thread.createdAt,
        url: noteUrl(noteId),
      },
    }
  } catch (error) {
    console.error('notes_add_comment execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export const notesReplyToCommentTool: Anthropic.Tool = {
  name: 'notes_reply_to_comment',
  description: 'Add a reply to an existing comment thread on a note.',
  input_schema: {
    type: 'object' as const,
    properties: {
      noteId: {
        type: 'string',
        description: 'Note ID (the value in /workspace/notes/{noteId}).',
      },
      threadId: {
        type: 'string',
        description: 'Thread ID to reply to.',
      },
      content: {
        type: 'string',
        description: 'Reply content.',
      },
    },
    required: ['noteId', 'threadId', 'content'],
  },
}

export async function executeNotesReplyToComment(
  parameters: Record<string, unknown>
): ToolResult {
  try {
    const noteId = asString(parameters.noteId)
    const threadId = asString(parameters.threadId)
    const content = asString(parameters.content)

    if (!noteId) return { success: false, error: 'noteId is required' }
    if (!threadId) return { success: false, error: 'threadId is required' }
    if (!content) return { success: false, error: 'content is required' }

    const auth = await getAuthenticatedContext()
    if ('error' in auth) return { success: false, error: auth.error }

    const note = await getOwnedNote(auth.supabase, auth.userId, noteId)
    if (!note) return { success: false, error: 'Note not found' }

    const comment = await createComment({
      documentId: noteId,
      threadId,
      userId: auth.userId,
      content,
    })

    return {
      success: true,
      data: {
        noteId,
        threadId,
        commentId: comment.id,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        url: noteUrl(noteId),
      },
    }
  } catch (error) {
    console.error('notes_reply_to_comment execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
