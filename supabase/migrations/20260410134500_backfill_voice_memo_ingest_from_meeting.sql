-- Migration: backfill voice_memo_ingest from historical meetings
-- Purpose: Allow strict hash-based backfill of legacy meetings into voice_memo_ingest
--          so desktop and web can deterministically map the same audio file to one meeting.
-- Affected: function ai_transcriber.backfill_voice_memo_ingest_from_meeting.
-- Notes:
--   - This function is idempotent (safe to call repeatedly).
--   - It never creates meetings rows; it only links or updates ingest rows.
--   - Baseline stage is derived from meeting content:
--       summarized -> transcribed -> meeting_created.

create or replace function ai_transcriber.backfill_voice_memo_ingest_from_meeting(
  p_meeting_id uuid,
  p_content_fingerprint text,
  p_source text default 'web_upload'
)
returns table (
  ingest_id uuid,
  meeting_id uuid,
  stage text,
  content_fingerprint text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_meeting ai_transcriber.meetings%rowtype;
  v_existing ai_transcriber.voice_memo_ingest%rowtype;
  v_stage text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_meeting_id is null then
    raise exception 'meeting_id is required';
  end if;

  if p_content_fingerprint is null or length(trim(p_content_fingerprint)) < 32 then
    raise exception 'invalid content_fingerprint';
  end if;

  if p_source not in ('desktop_voice_memo', 'web_upload') then
    raise exception 'invalid source';
  end if;

  select *
  into strict v_meeting
  from ai_transcriber.meetings
  where ai_transcriber.meetings.id = p_meeting_id
    and ai_transcriber.meetings.user_id = v_uid;

  v_stage := case
    when v_meeting.summary is not null
      or v_meeting.summary_jsonb is not null then 'summarized'
    when v_meeting.transcription is not null then 'transcribed'
    else 'meeting_created'
  end;

  insert into ai_transcriber.voice_memo_ingest (
    user_id,
    source,
    content_fingerprint,
    stage,
    meeting_id,
    storage_path,
    original_file_name,
    recording_created_at,
    last_error
  ) values (
    v_uid,
    p_source,
    trim(p_content_fingerprint),
    v_stage,
    v_meeting.id,
    v_meeting.audio_file_path,
    v_meeting.original_file_name,
    v_meeting.meeting_at,
    null
  )
  on conflict (user_id, content_fingerprint) do update
  set
    updated_at = now(),
    meeting_id = coalesce(
      ai_transcriber.voice_memo_ingest.meeting_id,
      excluded.meeting_id
    ),
    storage_path = coalesce(
      excluded.storage_path,
      ai_transcriber.voice_memo_ingest.storage_path
    ),
    original_file_name = coalesce(
      excluded.original_file_name,
      ai_transcriber.voice_memo_ingest.original_file_name
    ),
    recording_created_at = coalesce(
      excluded.recording_created_at,
      ai_transcriber.voice_memo_ingest.recording_created_at
    ),
    stage = case
      when ai_transcriber.voice_memo_ingest.stage in ('summarized', 'dismissed') then ai_transcriber.voice_memo_ingest.stage
      else excluded.stage
    end,
    last_error = null;

  select *
  into strict v_existing
  from ai_transcriber.voice_memo_ingest
  where ai_transcriber.voice_memo_ingest.user_id = v_uid
    and ai_transcriber.voice_memo_ingest.content_fingerprint = trim(p_content_fingerprint);

  if v_existing.meeting_id is not null and v_existing.meeting_id <> p_meeting_id then
    raise exception 'fingerprint already linked to different meeting_id';
  end if;

  return query
  select
    v_existing.id,
    coalesce(v_existing.meeting_id, p_meeting_id),
    v_existing.stage,
    v_existing.content_fingerprint;
end;
$$;

comment on function ai_transcriber.backfill_voice_memo_ingest_from_meeting is
  'Idempotent strict-hash backfill for historical meetings. Links existing meeting to voice_memo_ingest by fingerprint.';

grant execute on function ai_transcriber.backfill_voice_memo_ingest_from_meeting(uuid, text, text) to authenticated;
grant execute on function ai_transcriber.backfill_voice_memo_ingest_from_meeting(uuid, text, text) to service_role;
