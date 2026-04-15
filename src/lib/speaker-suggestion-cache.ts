import type { SpeakerIdentifyResponse, SpeakerSuggestionResult } from "@/types"

type CachedMatch = {
  contact_id: string
  first_name: string
  last_name: string
  similarity: number
}

type PredictionRow = {
  speaker_index: number
  matches_jsonb: CachedMatch[] | null
  model_version: string | null
}

type SpeakerPredictionInsertRow = {
  meeting_id: string
  user_id: string
  speaker_index: number
  matches_jsonb: CachedMatch[]
  top_contact_id: string | null
  top_similarity: number | null
  model_version: string | null
}

type QueryError = {
  message: string
} | null

type SelectPredictionRowsQuery = {
  eq: (column: string, value: string) => {
    order: (column: string) => Promise<{
      data: PredictionRow[] | null
      error: QueryError
    }>
  }
}

type DeletePredictionRowsQuery = {
  eq: (column: string, value: string) => Promise<{
    error: QueryError
  }>
}

type MeetingSpeakerPredictionsTable = {
  select: (columns: string) => SelectPredictionRowsQuery
  delete: () => DeletePredictionRowsQuery
  upsert: (
    rows: SpeakerPredictionInsertRow[],
    options: { onConflict: string }
  ) => Promise<{
    error: QueryError
  }>
}

export type SpeakerSuggestionCacheClient = {
  from: (table: "meeting_speaker_predictions") => MeetingSpeakerPredictionsTable
}

function isCachedMatch(value: unknown): value is CachedMatch {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.contact_id === "string"
    && typeof candidate.first_name === "string"
    && typeof candidate.last_name === "string"
    && typeof candidate.similarity === "number"
}

function normalizeMatches(value: unknown): CachedMatch[] {
  if (!Array.isArray(value)) return []
  return value.filter(isCachedMatch)
}

export function mapPredictionRowsToResponse(rows: PredictionRow[]): SpeakerIdentifyResponse {
  const speakers: SpeakerSuggestionResult[] = rows
    .sort((a, b) => a.speaker_index - b.speaker_index)
    .map((row) => ({
      speaker_index: row.speaker_index,
      matches: normalizeMatches(row.matches_jsonb),
    }))

  const modelVersion = rows.find((row) => row.model_version)?.model_version ?? null

  return {
    speakers,
    model_version: modelVersion,
  }
}

export async function fetchCachedSpeakerSuggestions(
  supabase: SpeakerSuggestionCacheClient,
  meetingId: string
): Promise<SpeakerIdentifyResponse | null> {
  const { data, error } = await supabase
    .from("meeting_speaker_predictions")
    .select("speaker_index,matches_jsonb,model_version")
    .eq("meeting_id", meetingId)
    .order("speaker_index")

  if (error) {
    throw new Error(`Failed to load cached speaker suggestions: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return null
  }

  return mapPredictionRowsToResponse(data)
}

export async function replaceCachedSpeakerSuggestions(
  supabase: SpeakerSuggestionCacheClient,
  meetingId: string,
  userId: string,
  response: SpeakerIdentifyResponse
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("meeting_speaker_predictions")
    .delete()
    .eq("meeting_id", meetingId)

  if (deleteError) {
    throw new Error(`Failed to clear cached speaker suggestions: ${deleteError.message}`)
  }

  if (response.speakers.length === 0) {
    return
  }

  const rows = response.speakers.map((speaker) => {
    const topMatch = speaker.matches[0]
    return {
      meeting_id: meetingId,
      user_id: userId,
      speaker_index: speaker.speaker_index,
      matches_jsonb: speaker.matches,
      top_contact_id: topMatch?.contact_id ?? null,
      top_similarity: topMatch?.similarity ?? null,
      model_version: response.model_version,
    }
  })

  const { error: upsertError } = await supabase
    .from("meeting_speaker_predictions")
    .upsert(rows, { onConflict: "meeting_id,speaker_index" })

  if (upsertError) {
    throw new Error(`Failed to save cached speaker suggestions: ${upsertError.message}`)
  }
}
