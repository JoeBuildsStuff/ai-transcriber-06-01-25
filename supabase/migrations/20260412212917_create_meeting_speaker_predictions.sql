create table if not exists ai_transcriber.meeting_speaker_predictions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid(),
  meeting_id        uuid not null
                      references ai_transcriber.meetings (id) on delete cascade,
  speaker_index     integer not null,
  matches_jsonb     jsonb not null default '[]'::jsonb,
  top_contact_id    uuid null
                      references ai_transcriber.new_contacts (id) on delete set null,
  top_similarity    double precision null,
  model_version     text null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint meeting_speaker_predictions_meeting_speaker_unique
    unique (meeting_id, speaker_index)
);

create index if not exists idx_meeting_speaker_predictions_user_meeting
  on ai_transcriber.meeting_speaker_predictions (user_id, meeting_id, speaker_index);

alter table ai_transcriber.meeting_speaker_predictions enable row level security;

drop policy if exists "Users can view their own meeting speaker predictions"
  on ai_transcriber.meeting_speaker_predictions;
create policy "Users can view their own meeting speaker predictions"
  on ai_transcriber.meeting_speaker_predictions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own meeting speaker predictions"
  on ai_transcriber.meeting_speaker_predictions;
create policy "Users can insert their own meeting speaker predictions"
  on ai_transcriber.meeting_speaker_predictions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own meeting speaker predictions"
  on ai_transcriber.meeting_speaker_predictions;
create policy "Users can update their own meeting speaker predictions"
  on ai_transcriber.meeting_speaker_predictions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own meeting speaker predictions"
  on ai_transcriber.meeting_speaker_predictions;
create policy "Users can delete their own meeting speaker predictions"
  on ai_transcriber.meeting_speaker_predictions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
