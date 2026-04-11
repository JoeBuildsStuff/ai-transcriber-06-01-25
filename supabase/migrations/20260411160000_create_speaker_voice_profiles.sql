-- Migration: speaker_voice_profiles for voice-based speaker identification
-- Purpose: Store ECAPA-TDNN speaker embeddings (192-dim vectors) linked to contacts
--          and meetings. Enables cosine similarity search to auto-suggest which contact
--          corresponds to a diarized speaker in a new meeting.
-- Affected: new table ai_transcriber.speaker_voice_profiles, HNSW index on embedding,
--           RLS policies for authenticated users.
-- Requires: pgvector extension (already installed in public schema).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table ai_transcriber.speaker_voice_profiles (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid not null
                   references ai_transcriber.new_contacts (id) on delete cascade,
  meeting_id     uuid not null
                   references ai_transcriber.meetings (id) on delete cascade,
  user_id        uuid not null default auth.uid(),
  embedding      vector(192) not null,
  segment_count  integer not null default 1,
  model_version  text not null default 'ecapa-tdnn-voxceleb',
  created_at     timestamptz not null default now(),

  constraint speaker_voice_profiles_contact_meeting_unique
    unique (contact_id, meeting_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_speaker_voice_profiles_embedding
  on ai_transcriber.speaker_voice_profiles
  using hnsw (embedding vector_cosine_ops);

create index idx_speaker_voice_profiles_contact
  on ai_transcriber.speaker_voice_profiles (contact_id);

create index idx_speaker_voice_profiles_user
  on ai_transcriber.speaker_voice_profiles (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table ai_transcriber.speaker_voice_profiles enable row level security;

create policy "Users can view their own speaker voice profiles"
  on ai_transcriber.speaker_voice_profiles
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "Users can insert their own speaker voice profiles"
  on ai_transcriber.speaker_voice_profiles
  for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "Users can update their own speaker voice profiles"
  on ai_transcriber.speaker_voice_profiles
  for update
  to authenticated
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "Users can delete their own speaker voice profiles"
  on ai_transcriber.speaker_voice_profiles
  for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- Service role bypass for the backfill script and FastAPI microservice.
-- The service_role key bypasses RLS by default, so no additional policy is needed.
