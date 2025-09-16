-- Migration: Add meeting tags support
-- Purpose: Enable tagging meetings with user-defined labels
-- Tables: tags, meeting_tags
-- Date: 2025-09-15

-- Create tags table for user-owned tag definitions
create table if not exists ai_transcriber.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure tag names are unique per user (case insensitive)
create unique index if not exists tags_user_name_unique
  on ai_transcriber.tags (user_id, lower(name));

-- Keep tags ordered by creation and searchable by user
create index if not exists tags_user_created_at_idx
  on ai_transcriber.tags (user_id, created_at desc);

-- Update updated_at automatically on change
drop trigger if exists handle_tags_updated_at on ai_transcriber.tags;
create trigger handle_tags_updated_at
  before update on ai_transcriber.tags
  for each row execute function ai_transcriber.handle_updated_at();

-- Junction table linking meetings and tags
create table if not exists ai_transcriber.meeting_tags (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references ai_transcriber.meetings(id) on delete cascade,
  tag_id uuid not null references ai_transcriber.tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  unique (meeting_id, tag_id)
);

create index if not exists meeting_tags_meeting_id_idx
  on ai_transcriber.meeting_tags (meeting_id);

create index if not exists meeting_tags_tag_id_idx
  on ai_transcriber.meeting_tags (tag_id);

create index if not exists meeting_tags_user_id_idx
  on ai_transcriber.meeting_tags (user_id);

-- Enable RLS
alter table ai_transcriber.tags enable row level security;
alter table ai_transcriber.meeting_tags enable row level security;

-- Tags policies: scoped to owner
create policy "Users can view their tags" on ai_transcriber.tags
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create tags" on ai_transcriber.tags
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update tags" on ai_transcriber.tags
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete tags" on ai_transcriber.tags
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Meeting tag policies: scoped to owner
create policy "Users can view their meeting tags" on ai_transcriber.meeting_tags
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create meeting tags" on ai_transcriber.meeting_tags
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete meeting tags" on ai_transcriber.meeting_tags
  for delete to authenticated
  using ((select auth.uid()) = user_id);
