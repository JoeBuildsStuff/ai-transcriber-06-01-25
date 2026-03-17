import { NextResponse } from 'next/server'
import { z } from 'zod'

import { deleteComment, updateComment } from '@/components/tiptap/lib/comments'
import { createClient } from '@/lib/supabase/server'

async function ensureAuthenticated(): Promise<string | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return user.id
}

const patchSchema = z.object({
  content: z.string().trim().min(1).max(10000),
})

type RouteContext = {
  params: Promise<{ id: string; threadId: string; commentId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const userIdOrResponse = await ensureAuthenticated()
  if (userIdOrResponse instanceof NextResponse) {
    return userIdOrResponse
  }

  const { id, threadId, commentId } = await context.params

  let payload: z.infer<typeof patchSchema>
  try {
    payload = patchSchema.parse(await request.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? 'Invalid payload')
        : 'Invalid JSON body'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    const comment = await updateComment({
      documentId: id,
      threadId,
      commentId,
      userId: userIdOrResponse,
      content: payload.content,
    })
    return NextResponse.json({ comment })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Document not found' ||
        error.message === 'Comment not found')
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (
      error instanceof Error &&
      error.message === 'Comment content is required'
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Failed to update comment', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const userIdOrResponse = await ensureAuthenticated()
  if (userIdOrResponse instanceof NextResponse) {
    return userIdOrResponse
  }

  const { id, threadId, commentId } = await context.params

  try {
    await deleteComment({
      documentId: id,
      threadId,
      commentId,
      userId: userIdOrResponse,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Document not found' ||
        error.message === 'Comment not found')
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Failed to delete comment', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
