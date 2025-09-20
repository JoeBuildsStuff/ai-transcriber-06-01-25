interface SuggestionSummary {
  filters: Array<{ column: string; value: unknown }>
  sorting: Array<{ column: string; direction: "asc" | "desc" }>
  hiddenColumns: string[]
  visibleColumns: string[]
  columnOrder: string[]
  tableKey: string
}

interface SuggestionResponse {
  name?: string
  description?: string
}

function buildPrompt(summary: SuggestionSummary): string {
  const payload = JSON.stringify(summary, null, 2)

  return (
    `You are helping a user save a reusable view for a data table in a productivity app. ` +
    `Suggest a concise, descriptive title and an optional description that explain what the view highlights.
` +
    `Return ONLY a compact JSON object using this shape:
` +
    `{ "name": "<short title up to 60 characters>", "description": "<optional description up to 160 characters>" }
` +
    `Use an empty string if no description is needed.
` +
    `Avoid quotation marks in the values beyond those required for valid JSON.
` +
    `Current table configuration summary:
${payload}`
  )
}

function sanitizeMessage(raw: unknown): string {
  if (typeof raw !== "string") {
    return JSON.stringify(raw)
  }

  return raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim()
}

export async function generateSavedViewSuggestion(
  summary: SuggestionSummary,
  signal?: AbortSignal,
): Promise<SuggestionResponse> {

  const response = await fetch("/api/chat/cerebras", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: buildPrompt(summary),
      model: "gpt-oss-120b",
      reasoning_effort: "low",
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to generate suggestion (${response.status})`)
  }

  const data = (await response.json()) as { message?: unknown }
  if (!data?.message) {
    throw new Error("Suggestion response missing message field")
  }

  const cleaned = sanitizeMessage(data.message)

  try {
    const parsed = JSON.parse(cleaned) as SuggestionResponse
    return parsed
  } catch {
    throw new Error("Unable to parse suggestion response")
  }
}

export type {
  SuggestionSummary,
  SuggestionResponse,
}
