-- Migration: Create saved views table for data tables
-- Purpose: Store per-user saved table configurations (filters, sorting, visibility)
-- Date: 2025-09-15

create table ai_transcriber.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  table_key text not null,
  name text not null,
  description text,
  state jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(user_id, table_key, name)
);

comment on table ai_transcriber.saved_views is 'Saved table configurations per user (filters, sorting, visibility, etc.)';
comment on column ai_transcriber.saved_views.table_key is 'Identifier for which table/view this configuration applies to (e.g., contacts, meetings)';
comment on column ai_transcriber.saved_views.state is 'JSON payload storing DataTable state (filters, sorting, column visibility/order, pagination, metadata)';

create index saved_views_user_table_idx on ai_transcriber.saved_views(user_id, table_key);

alter table ai_transcriber.saved_views enable row level security;

create policy "Users can view their own saved views" on ai_transcriber.saved_views
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own saved views" on ai_transcriber.saved_views
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own saved views" on ai_transcriber.saved_views
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own saved views" on ai_transcriber.saved_views
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create trigger handle_saved_views_updated_at
  before update on ai_transcriber.saved_views
  for each row
  execute function ai_transcriber.handle_updated_at();
