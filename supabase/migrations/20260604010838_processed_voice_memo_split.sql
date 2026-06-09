-- Processed voice memo split support for the macOS ingest lane.
-- Creates two coherent child meetings from one already-transcribed source meeting.

alter table ai_transcriber.meetings
  add column if not exists split_superseded_at timestamptz;

comment on column ai_transcriber.meetings.split_superseded_at is
  'Set when a processed voice memo has been replaced by split child meetings.';

create table if not exists ai_transcriber.meeting_splits (
  id uuid primary key default gen_random_uuid(),
  source_meeting_id uuid not null references ai_transcriber.meetings (id) on delete cascade,
  child_meeting_id uuid not null references ai_transcriber.meetings (id) on delete cascade,
  part_index integer not null check (part_index in (1, 2)),
  cut_offset_seconds double precision not null check (cut_offset_seconds > 0),
  source_start_seconds double precision not null check (source_start_seconds >= 0),
  source_end_seconds double precision not null check (source_end_seconds > source_start_seconds),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint meeting_splits_source_part_unique unique (source_meeting_id, part_index),
  constraint meeting_splits_child_unique unique (child_meeting_id)
);

create index if not exists meeting_splits_created_by_idx
  on ai_transcriber.meeting_splits (created_by, created_at desc);

alter table ai_transcriber.meeting_splits enable row level security;

drop policy if exists "meeting_splits owner select" on ai_transcriber.meeting_splits;
create policy "meeting_splits owner select" on ai_transcriber.meeting_splits
  for select
  to authenticated
  using ((select auth.uid()) = created_by);

drop policy if exists "meeting_splits owner insert" on ai_transcriber.meeting_splits;
create policy "meeting_splits owner insert" on ai_transcriber.meeting_splits
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "meeting_splits owner update" on ai_transcriber.meeting_splits;
create policy "meeting_splits owner update" on ai_transcriber.meeting_splits
  for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

drop policy if exists "meeting_splits owner delete" on ai_transcriber.meeting_splits;
create policy "meeting_splits owner delete" on ai_transcriber.meeting_splits
  for delete
  to authenticated
  using ((select auth.uid()) = created_by);

create or replace function ai_transcriber.finalize_processed_voice_memo_split(
  p_source_meeting_id uuid,
  p_cut_offset_seconds double precision,
  p_first jsonb,
  p_second jsonb
)
returns table (
  source_meeting_id uuid,
  child_meeting_id uuid,
  child_ingest_id uuid,
  part_index integer,
  storage_path text
)
language plpgsql
security invoker
set search_path = ''
as $finalize_processed_voice_memo_split$
declare
  v_uid uuid := (select auth.uid());
  v_source ai_transcriber.meetings%rowtype;
  v_part record;
  v_child_meeting_id uuid;
  v_child_ingest_id uuid;
  v_indices integer[];
  v_duration double precision;
  v_source_start double precision;
  v_source_end double precision;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_cut_offset_seconds is null or p_cut_offset_seconds <= 0 then
    raise exception 'invalid cut offset';
  end if;

  select *
  into v_source
  from ai_transcriber.meetings
  where id = p_source_meeting_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'source meeting not found or access denied';
  end if;

  if v_source.split_superseded_at is not null then
    raise exception 'source meeting has already been split';
  end if;

  if nullif(trim(coalesce(v_source.summary, '')), '') is not null
     or v_source.summary_jsonb is not null
     or v_source.openai_response is not null then
    raise exception 'cannot split a meeting after summary generation';
  end if;

  update ai_transcriber.meetings
  set
    split_superseded_at = now(),
    updated_at = now()
  where id = p_source_meeting_id
    and user_id = v_uid;

  update ai_transcriber.voice_memo_ingest
  set
    stage = 'done',
    status = 'dismissed',
    updated_at = now()
  where meeting_id = p_source_meeting_id
    and user_id = v_uid;

  for v_part in
    select *
    from (
      values
        (1, p_first, 0::double precision),
        (2, p_second, p_cut_offset_seconds)
    ) as parts(part_index, payload, source_start)
  loop
    if v_part.payload is null or jsonb_typeof(v_part.payload) <> 'object' then
      raise exception 'invalid split part payload';
    end if;

    if nullif(trim(coalesce(v_part.payload ->> 'content_fingerprint', '')), '') is null
       or length(trim(v_part.payload ->> 'content_fingerprint')) < 32 then
      raise exception 'invalid split part content fingerprint';
    end if;

    if nullif(trim(coalesce(v_part.payload ->> 'storage_path', '')), '') is null then
      raise exception 'invalid split part storage path';
    end if;

    select coalesce(array_agg(value::integer order by value::integer), array[]::integer[])
    into v_indices
    from jsonb_array_elements_text(coalesce(v_part.payload -> 'present_speaker_indices', '[]'::jsonb)) as value;

    v_source_start := v_part.source_start;
    if v_part.part_index = 1 then
      v_source_end := p_cut_offset_seconds;
    else
      v_duration := nullif(v_part.payload #>> '{transcription,metadata,duration}', '')::double precision;
      v_source_end := p_cut_offset_seconds + coalesce(v_duration, 0);
    end if;

    if v_source_end <= v_source_start then
      raise exception 'invalid split part source range';
    end if;

    insert into ai_transcriber.meetings (
      user_id,
      audio_file_path,
      original_file_name,
      meeting_at,
      transcription,
      formatted_transcript,
      speaker_names,
      meeting_reviewed
    ) values (
      v_uid,
      v_part.payload ->> 'storage_path',
      coalesce(nullif(trim(v_part.payload ->> 'original_file_name'), ''), v_source.original_file_name, 'recording'),
      (v_part.payload ->> 'meeting_at')::timestamptz,
      v_part.payload -> 'transcription',
      coalesce(v_part.payload -> 'formatted_transcript', '[]'::jsonb),
      nullif(v_part.payload -> 'speaker_names', 'null'::jsonb),
      false
    )
    returning id into v_child_meeting_id;

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
      desktop_memo_key,
      local_path_snapshot,
      attempt_count
    ) values (
      v_uid,
      'desktop_voice_memo',
      trim(v_part.payload ->> 'content_fingerprint'),
      'pending_speaker_verification',
      'awaiting_speaker_verification',
      v_child_meeting_id,
      v_part.payload ->> 'storage_path',
      coalesce(nullif(trim(v_part.payload ->> 'original_file_name'), ''), 'recording'),
      (v_part.payload ->> 'recording_created_at')::timestamptz,
      v_part.payload ->> 'desktop_memo_key',
      v_part.payload ->> 'local_path_snapshot',
      0
    )
    returning id into v_child_ingest_id;

    insert into ai_transcriber.meeting_splits (
      source_meeting_id,
      child_meeting_id,
      part_index,
      cut_offset_seconds,
      source_start_seconds,
      source_end_seconds,
      created_by
    ) values (
      p_source_meeting_id,
      v_child_meeting_id,
      v_part.part_index,
      p_cut_offset_seconds,
      v_source_start,
      v_source_end,
      v_uid
    );

    insert into ai_transcriber.meeting_speakers (
      meeting_id,
      contact_id,
      speaker_index,
      speaker_name,
      role,
      is_primary_speaker,
      confidence_score,
      identified_at,
      assignment_source,
      created_at,
      updated_at
    )
    select
      v_child_meeting_id,
      source_speaker.contact_id,
      source_speaker.speaker_index,
      source_speaker.speaker_name,
      source_speaker.role,
      source_speaker.is_primary_speaker,
      source_speaker.confidence_score,
      source_speaker.identified_at,
      source_speaker.assignment_source,
      now(),
      now()
    from ai_transcriber.meeting_speakers as source_speaker
    where source_speaker.meeting_id = p_source_meeting_id
      and source_speaker.speaker_index = any(v_indices);

    insert into ai_transcriber.meeting_attendees (
      meeting_id,
      contact_id,
      user_id,
      invitation_status,
      attendance_status,
      role,
      invited_at,
      created_at,
      updated_at
    )
    select distinct
      v_child_meeting_id,
      child_speaker.contact_id,
      v_uid,
      'invited',
      'unknown',
      'attendee',
      now(),
      now(),
      now()
    from ai_transcriber.meeting_speakers as child_speaker
    where child_speaker.meeting_id = v_child_meeting_id
      and child_speaker.contact_id is not null
      and not exists (
        select 1
        from ai_transcriber.meeting_attendees as existing_attendee
        where existing_attendee.meeting_id = v_child_meeting_id
          and existing_attendee.contact_id = child_speaker.contact_id
          and existing_attendee.user_id = v_uid
      );

    insert into ai_transcriber.meeting_speaker_predictions (
      user_id,
      meeting_id,
      speaker_index,
      matches_jsonb,
      top_contact_id,
      top_similarity,
      model_version,
      created_at,
      updated_at
    )
    select
      v_uid,
      v_child_meeting_id,
      prediction.speaker_index,
      prediction.matches_jsonb,
      prediction.top_contact_id,
      prediction.top_similarity,
      prediction.model_version,
      now(),
      now()
    from ai_transcriber.meeting_speaker_predictions as prediction
    where prediction.meeting_id = p_source_meeting_id
      and prediction.user_id = v_uid
      and prediction.speaker_index = any(v_indices);

    return query
    select
      p_source_meeting_id,
      v_child_meeting_id,
      v_child_ingest_id,
      v_part.part_index,
      v_part.payload ->> 'storage_path';
  end loop;
end;
$finalize_processed_voice_memo_split$;

grant execute on function ai_transcriber.finalize_processed_voice_memo_split(
  uuid,
  double precision,
  jsonb,
  jsonb
) to authenticated, service_role;
