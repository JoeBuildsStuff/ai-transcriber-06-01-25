-- Migration: Create notes table with flexible associations
-- Purpose: Add a notes system that can be associated with multiple contacts and/or meetings
-- Tables: notes, contact_notes, meeting_notes
-- Date: 2025-01-06

-- Create the main notes table
create table ai_transcriber.notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create junction table for notes and contacts (many-to-many)
create table ai_transcriber.contact_notes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references ai_transcriber.notes(id) on delete cascade not null,
  contact_id uuid references ai_transcriber.new_contacts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamp with time zone default now(),
  -- Ensure unique combinations of note and contact
  unique(note_id, contact_id)
);

-- Create junction table for notes and meetings (many-to-many)
create table ai_transcriber.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references ai_transcriber.notes(id) on delete cascade not null,
  meeting_id uuid references ai_transcriber.meetings(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamp with time zone default now(),
  -- Ensure unique combinations of note and meeting
  unique(note_id, meeting_id)
);

-- Enable Row Level Security on all tables
alter table ai_transcriber.notes enable row level security;
alter table ai_transcriber.contact_notes enable row level security;
alter table ai_transcriber.meeting_notes enable row level security;

-- Create indexes for better performance
create index notes_user_id_idx on ai_transcriber.notes(user_id);
create index contact_notes_note_id_idx on ai_transcriber.contact_notes(note_id);
create index contact_notes_contact_id_idx on ai_transcriber.contact_notes(contact_id);
create index contact_notes_user_id_idx on ai_transcriber.contact_notes(user_id);
create index meeting_notes_note_id_idx on ai_transcriber.meeting_notes(note_id);
create index meeting_notes_meeting_id_idx on ai_transcriber.meeting_notes(meeting_id);
create index meeting_notes_user_id_idx on ai_transcriber.meeting_notes(user_id);

-- RLS Policies for notes table
-- Users can only access their own notes
create policy "Users can view their own notes" on ai_transcriber.notes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own notes" on ai_transcriber.notes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own notes" on ai_transcriber.notes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own notes" on ai_transcriber.notes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- RLS Policies for contact_notes table
-- Users can only access contact_notes for their own notes and contacts
create policy "Users can view their own contact notes" on ai_transcriber.contact_notes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own contact notes" on ai_transcriber.contact_notes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own contact notes" on ai_transcriber.contact_notes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own contact notes" on ai_transcriber.contact_notes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- RLS Policies for meeting_notes table
-- Users can only access meeting_notes for their own notes and meetings
create policy "Users can view their own meeting notes" on ai_transcriber.meeting_notes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own meeting notes" on ai_transcriber.meeting_notes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own meeting notes" on ai_transcriber.meeting_notes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own meeting notes" on ai_transcriber.meeting_notes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Create a function to automatically update the updated_at timestamp
create or replace function ai_transcriber.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at on notes table
create trigger handle_notes_updated_at
  before update on ai_transcriber.notes
  for each row
  execute function ai_transcriber.handle_updated_at(); 