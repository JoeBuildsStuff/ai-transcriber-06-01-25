export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Meetings = {
  id: string,
  created_at?: string,
  updated_at?: string,
  user_id?: string,
  audio_file_path?: string,
  original_file_name?: string,
  transcription?: Json,
  formatted_transcript?: Json,
  summary?: string,
  openai_response?: Json,
  title?: string,
  meeting_at?: string,
  speaker_names?: Json,
  summary_jsonb?: Json,
  meeting_reviewed?: boolean,
  user_notes?: string,
}

export type MeetingsList = {
  id: string,
  created_at?: string,
  updated_at?: string,
  title?: string,
  meeting_at?: string,
  speaker_names?: Json,
  meeting_reviewed?: boolean,
  original_file_name?: string,
  summary?: string,
  user_notes?: string,
}

export type MeetingsDetail = {
  id: string,
  created_at?: string,
  updated_at?: string,
  user_id?: string,
  audio_file_path?: string,
  original_file_name?: string,
  formatted_transcript?: Json,
  summary?: string,
  title?: string,
  meeting_at?: string,
  speaker_names?: Json,
  summary_jsonb?: Json,
  meeting_reviewed?: boolean,
  user_notes?: string,
}


