-- Migration: cut over voice_memo_ingest to stage + status model
-- Purpose:
--   - stage = kanban column (inbox, ready, processing, review, done)
--   - status = granular pipeline/review sub-state
-- Notes:
--   - Direct cutover with no compatibility bridge
--   - meeting_reviewed remains metadata but no longer drives canonical ingest state

-- ---------------------------------------------------------------------------
-- Table shape + data backfill
-- ---------------------------------------------------------------------------

alter table ai_transcriber.voice_memo_ingest
  rename column stage to status;

alter table ai_transcriber.voice_memo_ingest
  drop constraint if exists voice_memo_ingest_stage_check;

alter table ai_transcriber.voice_memo_ingest
  add column stage text;

update ai_transcriber.voice_memo_ingest as v
set
  stage = case
    when v.status = 'discovered' then 'inbox'
    when v.status in ('queued', 'uploaded', 'meeting_created', 'transcribed') then 'ready'
    when v.status = 'summarized' and coalesce(m.meeting_reviewed, false) then 'done'
    when v.status = 'summarized' then 'review'
    when v.status = 'dismissed' then 'done'
    when v.status = 'failed' then 'processing'
    else 'inbox'
  end,
  status = case
    when v.status = 'summarized' and coalesce(m.meeting_reviewed, false) then 'reviewed'
    when v.status = 'summarized' then 'awaiting_review'
    when v.status = 'dismissed' then 'dismissed'
    when v.status = 'failed' then 'failed_unknown'
    when v.status in ('discovered', 'queued', 'uploaded', 'meeting_created', 'transcribed') then v.status
    else 'failed_unknown'
  end
from ai_transcriber.meetings as m
where m.id = v.meeting_id;

update ai_transcriber.voice_memo_ingest
set
  stage = coalesce(stage, 'inbox'),
  status = case
    when status = 'failed' then 'failed_unknown'
    when status = 'summarized' then 'awaiting_review'
    when status = 'dismissed' then 'dismissed'
    when status in ('discovered', 'queued', 'uploaded', 'meeting_created', 'transcribed') then status
    when status is null then 'failed_unknown'
    else status
  end
where stage is null
   or status is null
   or status in ('failed', 'summarized', 'dismissed');

alter table ai_transcriber.voice_memo_ingest
  alter column stage set not null;

alter table ai_transcriber.voice_memo_ingest
  add constraint voice_memo_ingest_stage_check check (
    stage in ('inbox', 'ready', 'processing', 'review', 'done')
  );

alter table ai_transcriber.voice_memo_ingest
  add constraint voice_memo_ingest_status_check check (
    status in (
      'discovered',
      'queued',
      'uploading',
      'uploaded',
      'creating_meeting',
      'meeting_created',
      'transcribing',
      'transcribed',
      'summarizing',
      'summarized',
      'awaiting_review',
      'reviewed',
      'dismissed',
      'failed_upload',
      'failed_transcription',
      'failed_summarization',
      'failed_unknown'
    )
  );

drop index if exists ai_transcriber.voice_memo_ingest_user_stage_idx;
create index voice_memo_ingest_user_stage_idx
  on ai_transcriber.voice_memo_ingest (user_id, stage);

create index voice_memo_ingest_user_status_idx
  on ai_transcriber.voice_memo_ingest (user_id, status);

comment on column ai_transcriber.voice_memo_ingest.stage is
  'Kanban board stage for this ingest row (inbox, ready, processing, review, done).';
comment on column ai_transcriber.voice_memo_ingest.status is
  'Detailed processing/review status for this ingest row.';

-- ---------------------------------------------------------------------------
-- RPC: claim_or_resume_memo_ingest now accepts stage + status
-- ---------------------------------------------------------------------------

drop function if exists ai_transcriber.claim_or_resume_memo_ingest(
  text, text, text, text, timestamptz, text, text, text, boolean, timestamptz, text, boolean
);

create or replace function ai_transcriber.claim_or_resume_memo_ingest(
  p_content_fingerprint text,
  p_source text,
  p_stage text default null,
  p_status text default null,
  p_original_file_name text default null,
  p_recording_created_at timestamptz default null,
  p_storage_path text default null,
  p_desktop_memo_key text default null,
  p_local_path_snapshot text default null,
  p_create_meeting_if_needed boolean default false,
  p_meeting_at timestamptz default null,
  p_last_error text default null,
  p_bump_attempt boolean default false
)
returns table (
  ingest_id uuid,
  meeting_id uuid,
  stage text,
  status text,
  storage_path text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row ai_transcriber.voice_memo_ingest%rowtype;
  v_new_meeting_id uuid;
  v_stage text;
  v_status text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_source is null or p_source not in ('desktop_voice_memo', 'web_upload') then
    raise exception 'invalid source';
  end if;

  if p_content_fingerprint is null or length(trim(p_content_fingerprint)) < 32 then
    raise exception 'invalid content_fingerprint';
  end if;

  v_status := coalesce(
    p_status,
    case p_stage
      when 'inbox' then 'discovered'
      when 'ready' then 'queued'
      when 'processing' then 'uploading'
      when 'review' then 'awaiting_review'
      when 'done' then 'reviewed'
      else null
    end,
    'discovered'
  );

  v_stage := coalesce(
    p_stage,
    case
      when v_status = 'discovered' then 'inbox'
      when v_status = 'queued' then 'ready'
      when v_status in ('awaiting_review') then 'review'
      when v_status in ('reviewed', 'dismissed') then 'done'
      else 'processing'
    end,
    'inbox'
  );

  if v_stage not in ('inbox', 'ready', 'processing', 'review', 'done') then
    raise exception 'invalid stage';
  end if;

  if v_status not in (
    'discovered',
    'queued',
    'uploading',
    'uploaded',
    'creating_meeting',
    'meeting_created',
    'transcribing',
    'transcribed',
    'summarizing',
    'summarized',
    'awaiting_review',
    'reviewed',
    'dismissed',
    'failed_upload',
    'failed_transcription',
    'failed_summarization',
    'failed_unknown'
  ) then
    raise exception 'invalid status';
  end if;

  insert into ai_transcriber.voice_memo_ingest (
    user_id,
    source,
    content_fingerprint,
    stage,
    status,
    original_file_name,
    recording_created_at,
    storage_path,
    desktop_memo_key,
    local_path_snapshot,
    last_error,
    attempt_count
  ) values (
    v_uid,
    p_source,
    trim(p_content_fingerprint),
    v_stage,
    v_status,
    p_original_file_name,
    p_recording_created_at,
    p_storage_path,
    p_desktop_memo_key,
    p_local_path_snapshot,
    p_last_error,
    case when coalesce(p_bump_attempt, false) then 1 else 0 end
  )
  on conflict (user_id, content_fingerprint) do update set
    updated_at = now(),
    original_file_name = coalesce(
      excluded.original_file_name,
      ai_transcriber.voice_memo_ingest.original_file_name
    ),
    recording_created_at = coalesce(
      excluded.recording_created_at,
      ai_transcriber.voice_memo_ingest.recording_created_at
    ),
    storage_path = coalesce(
      excluded.storage_path,
      ai_transcriber.voice_memo_ingest.storage_path
    ),
    desktop_memo_key = coalesce(
      excluded.desktop_memo_key,
      ai_transcriber.voice_memo_ingest.desktop_memo_key
    ),
    local_path_snapshot = coalesce(
      excluded.local_path_snapshot,
      ai_transcriber.voice_memo_ingest.local_path_snapshot
    ),
    stage = case
      when p_stage is not null then p_stage
      else ai_transcriber.voice_memo_ingest.stage
    end,
    status = case
      when p_status is not null then p_status
      else ai_transcriber.voice_memo_ingest.status
    end,
    last_error = case
      when p_last_error is not null then p_last_error
      else ai_transcriber.voice_memo_ingest.last_error
    end,
    attempt_count = ai_transcriber.voice_memo_ingest.attempt_count
      + case when coalesce(p_bump_attempt, false) then 1 else 0 end;

  select *
  into strict v_row
  from ai_transcriber.voice_memo_ingest
  where user_id = v_uid
    and content_fingerprint = trim(p_content_fingerprint)
  for update;

  if coalesce(p_create_meeting_if_needed, false)
     and v_row.meeting_id is null
     and v_row.storage_path is not null
     and length(trim(v_row.storage_path)) > 0
  then
    insert into ai_transcriber.meetings (
      user_id,
      audio_file_path,
      original_file_name,
      meeting_at
    ) values (
      v_uid,
      v_row.storage_path,
      coalesce(v_row.original_file_name, 'recording'),
      coalesce(p_meeting_at, v_row.recording_created_at, now())
    )
    returning id into v_new_meeting_id;

    update ai_transcriber.voice_memo_ingest
    set
      meeting_id = v_new_meeting_id,
      stage = 'processing',
      status = 'meeting_created',
      last_error = null,
      updated_at = now()
    where ai_transcriber.voice_memo_ingest.id = v_row.id;

    v_row.meeting_id := v_new_meeting_id;
    v_row.stage := 'processing';
    v_row.status := 'meeting_created';
  end if;

  return query
  select v_row.id, v_row.meeting_id, v_row.stage, v_row.status, v_row.storage_path;
end;
$$;

grant execute on function ai_transcriber.claim_or_resume_memo_ingest(
  text, text, text, text, text, timestamptz, text, text, text, boolean, timestamptz, text, boolean
) to authenticated;

grant execute on function ai_transcriber.claim_or_resume_memo_ingest(
  text, text, text, text, text, timestamptz, text, text, text, boolean, timestamptz, text, boolean
) to service_role;

-- ---------------------------------------------------------------------------
-- Backfill function: emit stage + status in new contract
-- ---------------------------------------------------------------------------

drop function if exists ai_transcriber.backfill_voice_memo_ingest_from_meeting(uuid, text, text);

create or replace function ai_transcriber.backfill_voice_memo_ingest_from_meeting(
  p_meeting_id uuid,
  p_content_fingerprint text,
  p_source text default 'web_upload'
)
returns table (
  ingest_id uuid,
  meeting_id uuid,
  stage text,
  status text,
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
  v_status text;
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

  if v_meeting.summary is not null
     or v_meeting.summary_jsonb is not null then
    if coalesce(v_meeting.meeting_reviewed, false) then
      v_stage := 'done';
      v_status := 'reviewed';
    else
      v_stage := 'review';
      v_status := 'awaiting_review';
    end if;
  elsif v_meeting.transcription is not null then
    v_stage := 'processing';
    v_status := 'transcribed';
  else
    v_stage := 'processing';
    v_status := 'meeting_created';
  end if;

  insert into ai_transcriber.voice_memo_ingest (
    user_id,
    source,
    content_fingerprint,
    stage,
    status,
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
    v_status,
    v_meeting.id,
    v_meeting.audio_file_path,
    v_meeting.original_file_name,
    v_meeting.meeting_at,
    null
  )
  on conflict on constraint voice_memo_ingest_user_fingerprint_unique do update
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
      when ai_transcriber.voice_memo_ingest.status in ('reviewed', 'dismissed') then ai_transcriber.voice_memo_ingest.stage
      else excluded.stage
    end,
    status = case
      when ai_transcriber.voice_memo_ingest.status in ('reviewed', 'dismissed') then ai_transcriber.voice_memo_ingest.status
      else excluded.status
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
    v_existing.status,
    v_existing.content_fingerprint;
end;
$$;

grant execute on function ai_transcriber.backfill_voice_memo_ingest_from_meeting(uuid, text, text) to authenticated;
grant execute on function ai_transcriber.backfill_voice_memo_ingest_from_meeting(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Analytics view
-- ---------------------------------------------------------------------------

create or replace view ai_transcriber.voice_memo_ingest_stage_stats
with (security_invoker = true) as
select
  user_id,
  stage,
  count(*)::bigint as row_count
from ai_transcriber.voice_memo_ingest
group by user_id, stage;
