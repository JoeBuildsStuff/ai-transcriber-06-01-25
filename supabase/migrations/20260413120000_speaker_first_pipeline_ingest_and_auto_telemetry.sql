-- Speaker-first pipeline: new ingest stage/status for pending speaker verification,
-- align claim_or_resume_memo_ingest status whitelist with voice_memo_ingest,
-- and extend speaker assignment telemetry for auto-assigned high-confidence matches.

-- ---------------------------------------------------------------------------
-- voice_memo_ingest: stage + status
-- ---------------------------------------------------------------------------

alter table ai_transcriber.voice_memo_ingest
  drop constraint if exists voice_memo_ingest_stage_check;

alter table ai_transcriber.voice_memo_ingest
  add constraint voice_memo_ingest_stage_check check (
    stage in (
      'inbox',
      'ready',
      'processing',
      'pending_speaker_verification',
      'review',
      'done'
    )
  );

alter table ai_transcriber.voice_memo_ingest
  drop constraint if exists voice_memo_ingest_status_check;

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
      'identifying_speakers',
      'speakers_predicted',
      'awaiting_speaker_verification',
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

comment on column ai_transcriber.voice_memo_ingest.stage is
  'Kanban-aligned stage: inbox, ready, processing, pending_speaker_verification, review, done.';

-- ---------------------------------------------------------------------------
-- speaker_match_events: selection_kind for automation
-- ---------------------------------------------------------------------------

alter table ai_transcriber.speaker_match_events
  drop constraint if exists speaker_match_events_selection_kind_check;

alter table ai_transcriber.speaker_match_events
  add constraint speaker_match_events_selection_kind_check
    check (
      selection_kind in (
        'accepted_top_suggestion',
        'picked_other_contact',
        'cleared',
        'manual_no_suggestions',
        'new_contact_then_assigned',
        'auto_assigned_high_confidence'
      )
    );

-- ---------------------------------------------------------------------------
-- apply_meeting_speaker_assignment: allow assignment_source = auto
-- ---------------------------------------------------------------------------

drop function if exists ai_transcriber.apply_meeting_speaker_assignment(
  uuid,
  integer,
  uuid,
  text,
  text,
  jsonb,
  text
);

create or replace function ai_transcriber.apply_meeting_speaker_assignment(
  p_meeting_id uuid,
  p_speaker_index integer,
  p_contact_id uuid default null,
  p_client text default null,
  p_assignment_source text default 'manual',
  p_suggestions jsonb default null,
  p_model_version text default null
)
returns setof ai_transcriber.meeting_speakers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing ai_transcriber.meeting_speakers%rowtype;
  v_result ai_transcriber.meeting_speakers%rowtype;
  v_contact_first_name text;
  v_contact_last_name text;
  v_speaker_name text := format('Speaker %s', p_speaker_index);
  v_selection_kind text;
  v_top_contact_id uuid;
  v_top_similarity double precision;
  v_speaker_key text := p_speaker_index::text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_client is null or p_client not in ('mac', 'web') then
    raise exception 'invalid client';
  end if;

  if p_assignment_source not in ('manual', 'suggestion', 'new_contact', 'auto') then
    raise exception 'invalid assignment source';
  end if;

  if p_speaker_index < 0 then
    raise exception 'invalid speaker index';
  end if;

  perform 1
  from ai_transcriber.meetings
  where id = p_meeting_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'meeting not found or access denied';
  end if;

  select *
  into v_existing
  from ai_transcriber.meeting_speakers
  where meeting_id = p_meeting_id
    and speaker_index = p_speaker_index
  for update;

  if p_contact_id is not null then
    select
      first_name,
      last_name
    into
      v_contact_first_name,
      v_contact_last_name
    from ai_transcriber.new_contacts
    where id = p_contact_id
      and user_id = v_uid;

    if not found then
      raise exception 'contact not found or access denied';
    end if;

    v_speaker_name := nullif(
      trim(concat_ws(' ', v_contact_first_name, v_contact_last_name)),
      ''
    );

    if v_speaker_name is null then
      v_speaker_name := format('Speaker %s', p_speaker_index);
    end if;
  end if;

  if p_suggestions is not null and nullif(trim(coalesce(p_suggestions ->> 'top_contact_id', '')), '') is not null then
    v_top_contact_id := nullif(trim(p_suggestions ->> 'top_contact_id'), '')::uuid;
  else
    v_top_contact_id := null;
  end if;

  if p_suggestions is not null and nullif(trim(coalesce(p_suggestions ->> 'top_similarity', '')), '') is not null then
    v_top_similarity := nullif(trim(p_suggestions ->> 'top_similarity'), '')::double precision;
  else
    v_top_similarity := null;
  end if;

  if p_contact_id is null then
    v_selection_kind := 'cleared';
  elsif p_assignment_source = 'new_contact' then
    v_selection_kind := 'new_contact_then_assigned';
  elsif p_assignment_source = 'auto' and p_contact_id is not null then
    v_selection_kind := 'auto_assigned_high_confidence';
  elsif v_top_contact_id is null then
    v_selection_kind := 'manual_no_suggestions';
  elsif p_contact_id = v_top_contact_id then
    v_selection_kind := 'accepted_top_suggestion';
  else
    v_selection_kind := 'picked_other_contact';
  end if;

  insert into ai_transcriber.meeting_speakers (
    meeting_id,
    contact_id,
    speaker_index,
    speaker_name,
    role,
    is_primary_speaker,
    identified_at,
    created_at,
    updated_at
  )
  values (
    p_meeting_id,
    p_contact_id,
    p_speaker_index,
    v_speaker_name,
    'attendee',
    p_speaker_index = 0,
    now(),
    now(),
    now()
  )
  on conflict (meeting_id, speaker_index) do update
  set
    contact_id = excluded.contact_id,
    speaker_name = excluded.speaker_name,
    updated_at = excluded.updated_at
  returning *
  into v_result;

  update ai_transcriber.meetings
  set
    speaker_names = coalesce(speaker_names, '{}'::jsonb)
      || jsonb_build_object(v_speaker_key, coalesce(to_jsonb(p_contact_id), 'null'::jsonb)),
    updated_at = now()
  where id = p_meeting_id
    and user_id = v_uid;

  insert into ai_transcriber.speaker_match_events (
    user_id,
    meeting_id,
    speaker_index,
    client,
    previous_contact_id,
    selected_contact_id,
    selection_kind,
    top_suggested_contact_id,
    top_suggested_similarity,
    suggestions_jsonb,
    model_version
  )
  values (
    v_uid,
    p_meeting_id,
    p_speaker_index,
    p_client,
    v_existing.contact_id,
    p_contact_id,
    v_selection_kind,
    v_top_contact_id,
    v_top_similarity,
    p_suggestions,
    p_model_version
  );

  return next v_result;
end;
$$;

grant execute on function ai_transcriber.apply_meeting_speaker_assignment(
  uuid,
  integer,
  uuid,
  text,
  text,
  jsonb,
  text
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- claim_or_resume_memo_ingest: new stage + full status whitelist
-- ---------------------------------------------------------------------------

drop function if exists ai_transcriber.claim_or_resume_memo_ingest(
  text, text, text, text, text, timestamptz, text, text, text, boolean, timestamptz, text, boolean
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
      when 'pending_speaker_verification' then 'awaiting_speaker_verification'
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
      when v_status = 'awaiting_speaker_verification' then 'pending_speaker_verification'
      when v_status in ('awaiting_review') then 'review'
      when v_status in ('reviewed', 'dismissed') then 'done'
      else 'processing'
    end,
    'inbox'
  );

  if v_stage not in (
    'inbox',
    'ready',
    'processing',
    'pending_speaker_verification',
    'review',
    'done'
  ) then
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
    'identifying_speakers',
    'speakers_predicted',
    'awaiting_speaker_verification',
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
