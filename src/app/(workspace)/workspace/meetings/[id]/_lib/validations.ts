import { Tag } from "@/types"

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Speaker = {
  id: string
  meeting_id: string
  speaker_index: number
  speaker_name: string | null
  contact_id: string | null
  first_name: string | null
  last_name: string | null
}

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
  summary_jsonb?: Json,
  meeting_reviewed?: boolean,
  location?: string,
}

export type MeetingsList = {
  id: string,
  created_at?: string,
  updated_at?: string,
  title?: string,
  meeting_at?: string,
  speakers?: Speaker[],
  meeting_reviewed?: boolean,
  original_file_name?: string,
  summary?: string,
  tags?: Tag[],
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
}
