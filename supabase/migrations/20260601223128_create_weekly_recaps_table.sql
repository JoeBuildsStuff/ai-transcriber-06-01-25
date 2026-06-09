create table if not exists ai_transcriber.weekly_recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  timezone text not null default 'America/New_York',
  status text not null default 'draft',
  source_meeting_ids uuid[] not null default '{}',
  content_markdown text not null default '',
  content_jsonb jsonb,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_recaps_week_order check (week_end >= week_start),
  constraint weekly_recaps_user_week_unique unique (user_id, week_start, week_end)
);

create index if not exists weekly_recaps_user_week_idx
  on ai_transcriber.weekly_recaps (user_id, week_start desc);

alter table ai_transcriber.weekly_recaps enable row level security;

drop policy if exists "weekly_recaps owner select" on ai_transcriber.weekly_recaps;
create policy "weekly_recaps owner select" on ai_transcriber.weekly_recaps
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "weekly_recaps owner insert" on ai_transcriber.weekly_recaps;
create policy "weekly_recaps owner insert" on ai_transcriber.weekly_recaps
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "weekly_recaps owner update" on ai_transcriber.weekly_recaps;
create policy "weekly_recaps owner update" on ai_transcriber.weekly_recaps
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "weekly_recaps owner delete" on ai_transcriber.weekly_recaps;
create policy "weekly_recaps owner delete" on ai_transcriber.weekly_recaps
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
