-- migration: add assignment_source to meeting_speakers and persist skipped speaker state
-- purpose:
--   1) add a durable assignment_source field so clients can restore skipped speakers.
--   2) keep apply_meeting_speaker_assignment aligned with client behavior.
-- affected objects:
--   - table ai_transcriber.meeting_speakers (new assignment_source column + check constraint)
--   - function ai_transcriber.apply_meeting_speaker_assignment(uuid, integer, uuid, text, text, jsonb, text)
-- special considerations:
--   - skipped assignments are valid only when p_contact_id is null.
--   - non-skipped clears (p_contact_id is null) persist assignment_source as null.

-- ---------------------------------------------------------------------------
-- meeting_speakers: persisted assignment source
-- ---------------------------------------------------------------------------

alter table ai_transcriber.meeting_speakers
  add column if not exists assignment_source text;

comment on column ai_transcriber.meeting_speakers.assignment_source is
  'Assignment origin for speaker mapping. Allowed values: manual, suggestion, new_contact, auto, skipped. Null means currently unassigned and not skipped.';

alter table ai_transcriber.meeting_speakers
  drop constraint if exists meeting_speakers_assignment_source_check;

alter table ai_transcriber.meeting_speakers
  add constraint meeting_speakers_assignment_source_check
    check (
      assignment_source is null
      or assignment_source in ('manual', 'suggestion', 'new_contact', 'auto', 'skipped')
    );

-- backfill historical assigned rows to manual so older mappings have a stable source.
-- rows without contact_id remain null (unassigned, not skipped).
update ai_transcriber.meeting_speakers
set assignment_source = 'manual'
where contact_id is not null
  and assignment_source is null;

-- ---------------------------------------------------------------------------
-- apply_meeting_speaker_assignment: persist assignment_source including skipped
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
  v_persisted_assignment_source text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_client is null or p_client not in ('mac', 'web') then
    raise exception 'invalid client';
  end if;

  if p_assignment_source not in ('manual', 'suggestion', 'new_contact', 'auto', 'skipped') then
    raise exception 'invalid assignment source';
  end if;

  if p_assignment_source = 'skipped' and p_contact_id is not null then
    raise exception 'skipped assignment cannot include contact_id';
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

  -- only persist a source when there is a contact assignment or explicit skip.
  -- plain clears should reset assignment_source to null.
  v_persisted_assignment_source := case
    when p_assignment_source = 'skipped' then 'skipped'
    when p_contact_id is not null then p_assignment_source
    else null
  end;

  insert into ai_transcriber.meeting_speakers (
    meeting_id,
    contact_id,
    speaker_index,
    speaker_name,
    role,
    is_primary_speaker,
    identified_at,
    assignment_source,
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
    v_persisted_assignment_source,
    now(),
    now()
  )
  on conflict (meeting_id, speaker_index) do update
  set
    contact_id = excluded.contact_id,
    speaker_name = excluded.speaker_name,
    assignment_source = excluded.assignment_source,
    updated_at = excluded.updated_at
  returning *
  into v_result;

  -- keep meeting_attendees in sync with speaker assignments.
  -- this only adds missing attendees; it never removes existing attendee rows.
  if p_contact_id is not null then
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
    select
      p_meeting_id,
      p_contact_id,
      v_uid,
      'invited',
      'unknown',
      'attendee',
      now(),
      now(),
      now()
    where not exists (
      select 1
      from ai_transcriber.meeting_attendees
      where meeting_id = p_meeting_id
        and contact_id = p_contact_id
        and user_id = v_uid
    );
  end if;

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
