import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as supabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type BackfillRequestBody = {
  batchSize?: number
  dryRun?: boolean
  includeLinked?: boolean
  meetingIds?: string[]
}

type BackfillResult = {
  meetingId: string
  audioFilePath: string
  status:
    | 'already_linked'
    | 'would_backfill'
    | 'backfilled'
    | 'download_failed'
    | 'hash_failed'
    | 'rpc_failed'
  detail?: string
  contentFingerprint?: string
  ingestId?: string
  stage?: string
}

type BackfillVoiceMemoIngestParams = {
  p_meeting_id: string
  p_content_fingerprint: string
  p_source?: string
}

type BackfillVoiceMemoIngestRow = {
  content_fingerprint: string
  ingest_id: string
  meeting_id: string
  stage: string
}

function clampBatchSize(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 25
  return Math.min(100, Math.max(1, Math.floor(value)))
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as BackfillRequestBody
    const batchSize = clampBatchSize(body.batchSize)
    const dryRun = body.dryRun === true
    const includeLinked = body.includeLinked === true
    const meetingIds = Array.isArray(body.meetingIds)
      ? body.meetingIds.filter((id) => typeof id === 'string' && id.length > 0)
      : []

    let meetingsQuery = supabase
      .schema('ai_transcriber')
      .from('meetings')
      .select('id,audio_file_path,created_at')
      .eq('user_id', user.id)
      .not('audio_file_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(Math.max(batchSize * 4, batchSize))

    if (meetingIds.length > 0) {
      meetingsQuery = meetingsQuery.in('id', meetingIds)
    }

    const { data: candidates, error: meetingsError } = await meetingsQuery
    if (meetingsError) {
      return NextResponse.json(
        { error: 'Failed to load meetings', detail: meetingsError.message },
        { status: 500 }
      )
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        dryRun,
        includeLinked,
        batchSize,
        totalCandidates: 0,
        attempted: 0,
        results: [] as BackfillResult[],
      })
    }

    const candidateIds = candidates.map((m) => m.id)
    const { data: existingRows, error: existingError } = await supabase
      .schema('ai_transcriber')
      .from('voice_memo_ingest')
      .select('meeting_id')
      .in('meeting_id', candidateIds)

    if (existingError) {
      return NextResponse.json(
        { error: 'Failed to check existing ingest links', detail: existingError.message },
        { status: 500 }
      )
    }

    const alreadyLinked = new Set(
      (existingRows ?? [])
        .map((row) => row.meeting_id)
        .filter((meetingId): meetingId is string => typeof meetingId === 'string')
    )

    const targets = candidates
      .filter((meeting) => includeLinked || !alreadyLinked.has(meeting.id))
      .slice(0, batchSize)

    const results: BackfillResult[] = []

    for (const meeting of targets) {
      const audioFilePath = meeting.audio_file_path
      if (!audioFilePath) continue

      if (!includeLinked && alreadyLinked.has(meeting.id)) {
        results.push({
          meetingId: meeting.id,
          audioFilePath,
          status: 'already_linked',
        })
        continue
      }

      const { data: audioBlob, error: downloadError } = await supabase.storage
        .from('ai-transcriber-audio')
        .download(audioFilePath)

      if (downloadError || !audioBlob) {
        results.push({
          meetingId: meeting.id,
          audioFilePath,
          status: 'download_failed',
          detail: downloadError?.message ?? 'Missing file data',
        })
        continue
      }

      let contentFingerprint = ''
      try {
        const fileBuffer = Buffer.from(await audioBlob.arrayBuffer())
        contentFingerprint = createHash('sha256').update(fileBuffer).digest('hex')
      } catch (error) {
        results.push({
          meetingId: meeting.id,
          audioFilePath,
          status: 'hash_failed',
          detail: error instanceof Error ? error.message : String(error),
        })
        continue
      }

      if (dryRun) {
        results.push({
          meetingId: meeting.id,
          audioFilePath,
          status: 'would_backfill',
          contentFingerprint,
        })
        continue
      }

      const { data: rpcRows, error: rpcError } = await (
        supabase as unknown as {
          rpc: (
            name: 'backfill_voice_memo_ingest_from_meeting',
            params: BackfillVoiceMemoIngestParams
          ) => Promise<{
            data: BackfillVoiceMemoIngestRow[] | null
            error: Error | null
          }>
        }
      ).rpc('backfill_voice_memo_ingest_from_meeting', {
        p_meeting_id: meeting.id,
        p_content_fingerprint: contentFingerprint,
        p_source: 'web_upload',
      })

      if (rpcError) {
        results.push({
          meetingId: meeting.id,
          audioFilePath,
          status: 'rpc_failed',
          contentFingerprint,
          detail: rpcError.message,
        })
        continue
      }

      const row = Array.isArray(rpcRows) ? rpcRows[0] : null
      results.push({
        meetingId: meeting.id,
        audioFilePath,
        status: 'backfilled',
        contentFingerprint,
        ingestId: row?.ingest_id ?? undefined,
        stage: row?.stage ?? undefined,
      })
    }

    return NextResponse.json({
      dryRun,
      includeLinked,
      batchSize,
      totalCandidates: candidates.length,
      attempted: targets.length,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Backfill failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
