export type Meetings = {
  id: string,
  created_at?: string,
  updated_at?: string,
  user_id?: string,
  audio_file_path?: string,
  original_file_name?: string,
  transcription?: Record<string, unknown>,
  formatted_transcript?: Record<string, unknown>,
  summary?: string,
  openai_response?: Record<string, unknown>,
  title?: string,
  meeting_at?: string,
  speaker_names?: Record<string, unknown>,
  summary_jsonb?: Record<string, unknown>,
  meeting_reviewed?: boolean,
  user_notes?: string,
}

export type MeetingsList = {
  id: string,
  created_at?: string,
  updated_at?: string,
  title?: string,
  meeting_at?: string,
  speaker_names?: Record<string, unknown>,
  meeting_reviewed?: boolean,
}

export type MeetingsDetail = {
  id: string,
  created_at?: string,
  updated_at?: string,
  user_id?: string,
  audio_file_path?: string,
  original_file_name?: string,
  formatted_transcript?: Record<string, unknown>,
  summary?: string,
  title?: string,
  meeting_at?: string,
  speaker_names?: Record<string, unknown>,
  summary_jsonb?: Record<string, unknown>,
  meeting_reviewed?: boolean,
  user_notes?: string,
}


