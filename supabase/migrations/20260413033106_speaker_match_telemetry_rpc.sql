-- Migration: speaker match telemetry + shared assignment RPC
-- Purpose:
--   1. Add append-only telemetry for speaker assignment decisions.
--   2. Deduplicate and constrain meeting_speakers for safe upserts.
--   3. Add a shared RPC used by web and mac clients.

-- ---------------------------------------------------------------------------
-- meeting_speakers dedupe + uniqueness
-- ---------------------------------------------------------------------------

with ranked as (
  select
    id,
    row_number() over (
      partition by meeting_id, speaker_index
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as row_num
  from ai_transcriber.meeting_speakers
)
delete from ai_transcriber.meeting_speakers as ms
using ranked
where ms.id = ranked.id
  and ranked.row_num > 1;

create unique index if not exists idx_meeting_speakers_meeting_speaker_unique
  on ai_transcriber.meeting_speakers (meeting_id, speaker_index);

-- ---------------------------------------------------------------------------
-- speaker_match_events table
-- ---------------------------------------------------------------------------

create table if not exists ai_transcriber.speaker_match_events (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null default auth.uid(),
  meeting_id               uuid not null
                             references ai_transcriber.meetings (id) on delete cascade,
  speaker_index            integer not null,
  client                   text not null,
  previous_contact_id      uuid null
                             references ai_transcriber.new_contacts (id) on delete set null,
  selected_contact_id      uuid null
                             references ai_transcriber.new_contacts (id) on delete set null,
  selection_kind           text not null,
  top_suggested_contact_id uuid null
                             references ai_transcriber.new_contacts (id) on delete set null,
  top_suggested_similarity double precision null,
  suggestions_jsonb        jsonb null,
  model_version            text null,
  created_at               timestamptz not null default now(),

  constraint speaker_match_events_client_check
    check (client in ('mac', 'web')),
  constraint speaker_match_events_selection_kind_check
    check (
      selection_kind in (
        'accepted_top_suggestion',
        'picked_other_contact',
        'cleared',
        'manual_no_suggestions',
        'new_contact_then_assigned'
      )
    )
);

create index if not exists idx_speaker_match_events_user_created
  on ai_transcriber.speaker_match_events (user_id, created_at desc);

create index if not exists idx_speaker_match_events_meeting_speaker_created
  on ai_transcriber.speaker_match_events (meeting_id, speaker_index, created_at desc);

-- ---------------------------------------------------------------------------
-- speaker_match_events RLS
-- ---------------------------------------------------------------------------

alter table ai_transcriber.speaker_match_events enable row level security;

drop policy if exists "Users can view their own speaker match events"
  on ai_transcriber.speaker_match_events;
create policy "Users can view their own speaker match events"
  on ai_transcriber.speaker_match_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own speaker match events"
  on ai_transcriber.speaker_match_events;
create policy "Users can insert their own speaker match events"
  on ai_transcriber.speaker_match_events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Shared RPC
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

  if p_assignment_source not in ('manual', 'suggestion', 'new_contact') then
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
