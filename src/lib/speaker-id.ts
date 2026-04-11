const SPEAKER_ID_SERVICE_URL = process.env.SPEAKER_ID_SERVICE_URL || "http://localhost:8100"
const SPEAKER_ID_API_KEY = process.env.SPEAKER_ID_API_KEY || ""

interface StoreProfileParams {
  audioStoragePath: string
  contactId: string
  meetingId: string
  userId: string
  speakerIndex: number
  transcription: Record<string, unknown>
}

/**
 * Fire-and-forget call to the speaker voice ID service to store a new
 * voice profile when a user confirms a speaker-contact mapping.
 */
export async function storeVoiceProfile(params: StoreProfileParams): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (SPEAKER_ID_API_KEY) {
      headers["X-API-Key"] = SPEAKER_ID_API_KEY
    }

    const resp = await fetch(`${SPEAKER_ID_SERVICE_URL}/embed`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        audio_storage_path: params.audioStoragePath,
        contact_id: params.contactId,
        meeting_id: params.meetingId,
        user_id: params.userId,
        speaker_index: params.speakerIndex,
        transcription: params.transcription,
      }),
      signal: AbortSignal.timeout(120_000),
    })

    if (!resp.ok) {
      console.error(`[speaker-id] /embed failed: ${resp.status}`, await resp.text())
    }
  } catch (error) {
    console.error("[speaker-id] /embed error (non-blocking):", error)
  }
}
