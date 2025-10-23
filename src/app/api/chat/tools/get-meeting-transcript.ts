import type { Anthropic } from '@anthropic-ai/sdk'
import { getMeeting } from '@/app/(workspace)/workspace/meetings/[id]/_lib/actions'
import { getMeetingSpeakers } from '@/actions/contacts'
import type { FormattedTranscriptGroup, MeetingSpeakerWithContact } from '@/types'

type SpeakerNameMap = Record<string, string>

type NormalizedTranscriptSegment = {
  speaker_index: number
  speaker_name: string
  start_seconds: number
  start_formatted: string
  text: string
}

const isFormattedTranscriptGroupArray = (value: unknown): value is FormattedTranscriptGroup[] => {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every((item) =>
    item &&
    typeof item === 'object' &&
    typeof (item as Record<string, unknown>).speaker !== 'undefined' &&
    typeof (item as Record<string, unknown>).start !== 'undefined' &&
    typeof (item as Record<string, unknown>).text === 'string'
  )
}

const parseFormattedTranscript = (value: unknown): FormattedTranscriptGroup[] | null => {
  if (!value) {
    return null
  }

  if (isFormattedTranscriptGroupArray(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return isFormattedTranscriptGroupArray(parsed) ? parsed : null
    } catch (error) {
      console.error('Failed to parse formatted transcript string', error)
      return null
    }
  }

  return null
}

const formatTimestamp = (seconds: number): string => {
  if (!Number.isFinite(seconds)) {
    return '0:00'
  }

  const clampedSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(clampedSeconds / 60)
  const remainingSeconds = clampedSeconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const getSpeakerDisplayName = (
  speakerIndex: number,
  speakers: MeetingSpeakerWithContact[],
  speakerNames: SpeakerNameMap | null
): string => {
  const matchingSpeaker = speakers.find((speaker) => speaker.speaker_index === speakerIndex)
  if (matchingSpeaker) {
    if (matchingSpeaker.contact) {
      const { first_name, last_name, primary_email } = matchingSpeaker.contact
      const fullName = `${first_name ?? ''} ${last_name ?? ''}`.trim()
      if (fullName) {
        return fullName
      }
      if (primary_email) {
        return primary_email
      }
    }

    const explicitName = matchingSpeaker.speaker_name?.trim()
    if (explicitName && explicitName.toLowerCase() !== `speaker ${speakerIndex}`) {
      return explicitName
    }
  }

  const fallbackFromMeeting = speakerNames?.[String(speakerIndex)]?.trim()
  if (fallbackFromMeeting) {
    return fallbackFromMeeting
  }

  return `Speaker ${speakerIndex}`
}

const normalizeTranscript = (
  transcript: FormattedTranscriptGroup[],
  speakers: MeetingSpeakerWithContact[],
  speakerNames: SpeakerNameMap | null
): NormalizedTranscriptSegment[] => {
  return transcript.map((segment) => {
    const speakerIndex = typeof segment.speaker === 'number'
      ? segment.speaker
      : Number.parseInt(String(segment.speaker), 10)

    const validSpeakerIndex = Number.isNaN(speakerIndex) ? 0 : speakerIndex
    const startSeconds = typeof segment.start === 'number'
      ? segment.start
      : Number.parseFloat(String(segment.start))
    const safeStart = Number.isFinite(startSeconds) ? startSeconds : 0

    const speakerName = getSpeakerDisplayName(validSpeakerIndex, speakers, speakerNames)

    return {
      speaker_index: validSpeakerIndex,
      speaker_name: speakerName,
      start_seconds: safeStart,
      start_formatted: formatTimestamp(safeStart),
      text: segment.text
    }
  })
}

const buildTranscriptText = (segments: NormalizedTranscriptSegment[]): string => {
  if (segments.length === 0) {
    return ''
  }

  const lines = segments.map((segment) =>
    `[${segment.start_formatted}] ${segment.speaker_name}: ${segment.text}`
  )

  return `Meeting Transcript\n\n${lines.join('\n\n')}`
}

export const getMeetingTranscriptTool: Anthropic.Tool = {
  name: 'get_meeting_transcript',
  description: 'Retrieve the formatted transcript for a meeting with resolved speaker names. Use after identifying the meeting when detailed dialogue is needed.',
  input_schema: {
    type: 'object' as const,
    properties: {
      meeting_id: {
        type: 'string',
        description: 'The unique identifier of the meeting whose transcript should be returned.'
      }
    },
    required: ['meeting_id']
  }
}

export async function executeGetMeetingTranscript(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const meetingIdParam = parameters.meeting_id ?? parameters.meetingId

    if (!meetingIdParam || typeof meetingIdParam !== 'string') {
      return { success: false, error: 'A meeting_id string parameter is required' }
    }

    const { data: meeting, error } = await getMeeting(meetingIdParam)

    if (error) {
      console.error('Get meeting transcript tool error:', error)
      return { success: false, error: error.message }
    }

    if (!meeting) {
      return { success: false, error: 'Meeting not found' }
    }

    const formattedTranscript = parseFormattedTranscript(meeting.formatted_transcript)

    if (!formattedTranscript || formattedTranscript.length === 0) {
      return {
        success: true,
        data: {
          meeting_id: meeting.id,
          meeting_title: meeting.title ?? 'Untitled Meeting',
          meeting_at: meeting.meeting_at ?? null,
          transcript_available: false,
          message: 'This meeting does not yet have a formatted transcript.',
          meeting_url: `/workspace/meetings/${meeting.id}`
        }
      }
    }

    const speakerNamesFromMeeting = (meeting as typeof meeting & { speaker_names?: SpeakerNameMap | null }).speaker_names ?? null

    let meetingSpeakers: MeetingSpeakerWithContact[] = []

    try {
      meetingSpeakers = await getMeetingSpeakers(meeting.id)
    } catch (speakerError) {
      console.error('Failed to load meeting speakers for transcript tool', speakerError)
    }

    const normalizedTranscript = normalizeTranscript(formattedTranscript, meetingSpeakers, speakerNamesFromMeeting)
    const transcriptText = buildTranscriptText(normalizedTranscript)
    const speakerMap = normalizedTranscript.reduce<Record<number, string>>((acc, segment) => {
      if (!(segment.speaker_index in acc)) {
        acc[segment.speaker_index] = segment.speaker_name
      }
      return acc
    }, {})
    const uniqueSpeakers = Object.entries(speakerMap)
      .map(([index, name]) => ({
        speaker_index: Number.parseInt(index, 10),
        speaker_name: name
      }))
      .sort((a, b) => a.speaker_index - b.speaker_index)

    return {
      success: true,
      data: {
        meeting_id: meeting.id,
        meeting_title: meeting.title ?? 'Untitled Meeting',
        meeting_at: meeting.meeting_at ?? null,
        transcript_available: true,
        segments: normalizedTranscript,
        transcript_text: transcriptText,
        meeting_url: `/workspace/meetings/${meeting.id}`,
        speaker_map: speakerMap,
        unique_speakers: uniqueSpeakers
      }
    }
  } catch (error) {
    console.error('Execute get meeting transcript error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
