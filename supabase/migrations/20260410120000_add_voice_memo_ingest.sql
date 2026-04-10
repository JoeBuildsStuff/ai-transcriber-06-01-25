-- Migration: voice_memo_ingest pipeline tracking
-- Purpose: Stable per-user fingerprint for voice/audio files, unified pipeline stages,
--          idempotent link to ai_transcriber.meetings, ops/analytics.
-- Affected: new table ai_transcriber.voice_memo_ingest, function claim_or_resume_memo_ingest,
--           view voice_memo_ingest_stage_stats.
-- Note: meeting_id uses ON DELETE SET NULL so ingest history survives meeting deletion.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table ai_transcriber.voice_memo_ingest (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  content_fingerprint text not null,
  stage text not null,
  meeting_id uuid references ai_transcriber.meetings (id) on delete set null,
  storage_path text,
  original_file_name text,
  recording_created_at timestamptz,
  last_error text,
  attempt_count integer not null default 0,
  desktop_memo_key text,
  local_path_snapshot text,
  client_instance_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_memo_ingest_source_check check (
    source in ('desktop_voice_memo', 'web_upload')
  ),
  constraint voice_memo_ingest_stage_check check (
    stage in (
      'discovered',
      'queued',
      'uploaded',
      'meeting_created',
      'transcribed',
      'summarized',
      'dismissed',
      'failed'
    )
  ),
  constraint voice_memo_ingest_user_fingerprint_unique unique (user_id, content_fingerprint)
);

comment on table ai_transcriber.voice_memo_ingest is
  'Tracks voice memo / upload pipeline per content fingerprint; links to meetings when created.';
comment on column ai_transcriber.voice_memo_ingest.content_fingerprint is
  'SHA-256 hex digest of file bytes; idempotency key per user.';
comment on column ai_transcriber.voice_memo_ingest.desktop_memo_key is
  'Optional Swift VoiceMemo.id (e.g. base64 path); not unique if file moves.';
comment on column ai_transcriber.voice_memo_ingest.meeting_id is
  'Set when a meetings row exists for this ingest; cleared if meeting deleted (SET NULL).';

create index voice_memo_ingest_user_stage_idx
  on ai_transcriber.voice_memo_ingest (user_id, stage);

create index voice_memo_ingest_user_updated_idx
  on ai_transcriber.voice_memo_ingest (user_id, updated_at desc);

create index voice_memo_ingest_meeting_id_idx
  on ai_transcriber.voice_memo_ingest (meeting_id)
  where meeting_id is not null;

drop trigger if exists handle_voice_memo_ingest_updated_at on ai_transcriber.voice_memo_ingest;
create trigger handle_voice_memo_ingest_updated_at
  before update on ai_transcriber.voice_memo_ingest
  for each row
  execute function ai_transcriber.handle_updated_at();

alter table ai_transcriber.voice_memo_ingest enable row level security;

-- ---------------------------------------------------------------------------
-- RLS (authenticated only; anon has no policies — default deny)
-- ---------------------------------------------------------------------------

create policy "voice_memo_ingest owner select" on ai_transcriber.voice_memo_ingest
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "voice_memo_ingest owner insert" on ai_transcriber.voice_memo_ingest
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "voice_memo_ingest owner update" on ai_transcriber.voice_memo_ingest
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "voice_memo_ingest owner delete" on ai_transcriber.voice_memo_ingest
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- RPC: atomic upsert + optional meeting creation (avoids duplicate meetings)
-- ---------------------------------------------------------------------------

create or replace function ai_transcriber.claim_or_resume_memo_ingest(
  p_content_fingerprint text,
  p_source text,
  p_stage text default null,
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

  v_stage := coalesce(p_stage, 'discovered');

  if v_stage not in (
    'discovered', 'queued', 'uploaded', 'meeting_created',
    'transcribed', 'summarized', 'dismissed', 'failed'
  ) then
    raise exception 'invalid stage';
  end if;

  insert into ai_transcriber.voice_memo_ingest (
    user_id,
    source,
    content_fingerprint,
    stage,
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
    last_error = case
      when p_last_error is not null then p_last_error
      else ai_transcriber.voice_memo_ingest.last_error
    end,
    attempt_count = ai_transcriber.voice_memo_ingest.attempt_count
      + case when coalesce(p_bump_attempt, false) then 1 else 0 end;

  select * into strict v_row
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
      stage = 'meeting_created',
      last_error = null,
      updated_at = now()
    where ai_transcriber.voice_memo_ingest.id = v_row.id;

    v_row.meeting_id := v_new_meeting_id;
    v_row.stage := 'meeting_created';
  end if;

  return query
  select v_row.id, v_row.meeting_id, v_row.stage, v_row.storage_path;
end;
$$;

comment on function ai_transcriber.claim_or_resume_memo_ingest is
  'Upserts ingest by (user, fingerprint); optionally creates meetings row once storage_path is set.';

grant execute on function ai_transcriber.claim_or_resume_memo_ingest(
  text, text, text, text, timestamptz, text, text, text, boolean, timestamptz, text, boolean
) to authenticated;

grant execute on function ai_transcriber.claim_or_resume_memo_ingest(
  text, text, text, text, timestamptz, text, text, text, boolean, timestamptz, text, boolean
) to service_role;

-- ---------------------------------------------------------------------------
-- Analytics view (security invoker so underlying RLS applies per caller)
-- ---------------------------------------------------------------------------

create or replace view ai_transcriber.voice_memo_ingest_stage_stats
with (security_invoker = true) as
select
  user_id,
  stage,
  count(*)::bigint as row_count
from ai_transcriber.voice_memo_ingest
group by user_id, stage;

comment on view ai_transcriber.voice_memo_ingest_stage_stats is
  'Per-user counts by pipeline stage; RLS on base table applies when queried as authenticated user.';

grant select on ai_transcriber.voice_memo_ingest_stage_stats to authenticated;
