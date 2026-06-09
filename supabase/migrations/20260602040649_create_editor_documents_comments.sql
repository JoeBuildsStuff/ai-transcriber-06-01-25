-- Rich editor documents, comments, and file storage for Voice Meeting desktop surfaces.

create table if not exists ai_transcriber.editor_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  surface_type text not null check (surface_type in ('meeting_summary', 'weekly_recap')),
  surface_id text not null,
  title text not null default 'Untitled',
  content text not null default '',
  document_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, surface_type, surface_id),
  unique (user_id, document_path)
);

create index if not exists editor_documents_user_surface_idx
  on ai_transcriber.editor_documents (user_id, surface_type, surface_id);

create index if not exists editor_documents_user_updated_idx
  on ai_transcriber.editor_documents (user_id, updated_at desc);

create table if not exists ai_transcriber.editor_comment_threads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references ai_transcriber.editor_documents(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'unresolved' check (status in ('unresolved', 'resolved')),
  anchor_from integer not null check (anchor_from >= 1),
  anchor_to integer not null check (anchor_to >= 1),
  anchor_exact text not null default '',
  anchor_prefix text not null default '',
  anchor_suffix text not null default '',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editor_comment_threads_document_id_idx
  on ai_transcriber.editor_comment_threads (document_id);

create index if not exists editor_comment_threads_document_updated_idx
  on ai_transcriber.editor_comment_threads (document_id, updated_at desc);

create table if not exists ai_transcriber.editor_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references ai_transcriber.editor_comment_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists editor_comments_thread_id_idx
  on ai_transcriber.editor_comments (thread_id);

create index if not exists editor_comments_thread_created_idx
  on ai_transcriber.editor_comments (thread_id, created_at asc);

create or replace function ai_transcriber.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists editor_documents_set_updated_at on ai_transcriber.editor_documents;
create trigger editor_documents_set_updated_at
before update on ai_transcriber.editor_documents
for each row execute function ai_transcriber.set_updated_at();

drop trigger if exists editor_comment_threads_set_updated_at on ai_transcriber.editor_comment_threads;
create trigger editor_comment_threads_set_updated_at
before update on ai_transcriber.editor_comment_threads
for each row execute function ai_transcriber.set_updated_at();

drop trigger if exists editor_comments_set_updated_at on ai_transcriber.editor_comments;
create trigger editor_comments_set_updated_at
before update on ai_transcriber.editor_comments
for each row execute function ai_transcriber.set_updated_at();

alter table ai_transcriber.editor_documents enable row level security;
alter table ai_transcriber.editor_comment_threads enable row level security;
alter table ai_transcriber.editor_comments enable row level security;

drop policy if exists "Editor documents: select own" on ai_transcriber.editor_documents;
create policy "Editor documents: select own"
  on ai_transcriber.editor_documents
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Editor documents: insert own" on ai_transcriber.editor_documents;
create policy "Editor documents: insert own"
  on ai_transcriber.editor_documents
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Editor documents: update own" on ai_transcriber.editor_documents;
create policy "Editor documents: update own"
  on ai_transcriber.editor_documents
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Editor documents: delete own" on ai_transcriber.editor_documents;
create policy "Editor documents: delete own"
  on ai_transcriber.editor_documents
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Editor threads: select own" on ai_transcriber.editor_comment_threads;
create policy "Editor threads: select own"
  on ai_transcriber.editor_comment_threads
  for select to authenticated
  using (
    exists (
      select 1
      from ai_transcriber.editor_documents d
      where d.id = editor_comment_threads.document_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editor threads: insert own" on ai_transcriber.editor_comment_threads;
create policy "Editor threads: insert own"
  on ai_transcriber.editor_comment_threads
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from ai_transcriber.editor_documents d
      where d.id = editor_comment_threads.document_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editor threads: update own" on ai_transcriber.editor_comment_threads;
create policy "Editor threads: update own"
  on ai_transcriber.editor_comment_threads
  for update to authenticated
  using (
    exists (
      select 1
      from ai_transcriber.editor_documents d
      where d.id = editor_comment_threads.document_id
        and d.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from ai_transcriber.editor_documents d
      where d.id = editor_comment_threads.document_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editor threads: delete own" on ai_transcriber.editor_comment_threads;
create policy "Editor threads: delete own"
  on ai_transcriber.editor_comment_threads
  for delete to authenticated
  using (
    exists (
      select 1
      from ai_transcriber.editor_documents d
      where d.id = editor_comment_threads.document_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editor comments: select own" on ai_transcriber.editor_comments;
create policy "Editor comments: select own"
  on ai_transcriber.editor_comments
  for select to authenticated
  using (
    exists (
      select 1
      from ai_transcriber.editor_comment_threads t
      join ai_transcriber.editor_documents d on d.id = t.document_id
      where t.id = editor_comments.thread_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editor comments: insert own" on ai_transcriber.editor_comments;
create policy "Editor comments: insert own"
  on ai_transcriber.editor_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from ai_transcriber.editor_comment_threads t
      join ai_transcriber.editor_documents d on d.id = t.document_id
      where t.id = editor_comments.thread_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editor comments: update own" on ai_transcriber.editor_comments;
create policy "Editor comments: update own"
  on ai_transcriber.editor_comments
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from ai_transcriber.editor_comment_threads t
      join ai_transcriber.editor_documents d on d.id = t.document_id
      where t.id = editor_comments.thread_id
        and d.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from ai_transcriber.editor_comment_threads t
      join ai_transcriber.editor_documents d on d.id = t.document_id
      where t.id = editor_comments.thread_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "Editor comments: delete own" on ai_transcriber.editor_comments;
create policy "Editor comments: delete own"
  on ai_transcriber.editor_comments
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from ai_transcriber.editor_comment_threads t
      join ai_transcriber.editor_documents d on d.id = t.document_id
      where t.id = editor_comments.thread_id
        and d.user_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public)
values ('ai-transcriber-editor-files', 'ai-transcriber-editor-files', false)
on conflict (id) do nothing;

drop policy if exists "Editor files: select own" on storage.objects;
create policy "Editor files: select own"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ai-transcriber-editor-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Editor files: insert own" on storage.objects;
create policy "Editor files: insert own"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ai-transcriber-editor-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Editor files: update own" on storage.objects;
create policy "Editor files: update own"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ai-transcriber-editor-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'ai-transcriber-editor-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Editor files: delete own" on storage.objects;
create policy "Editor files: delete own"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ai-transcriber-editor-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

grant all on ai_transcriber.editor_documents to authenticated, service_role;
grant all on ai_transcriber.editor_comment_threads to authenticated, service_role;
grant all on ai_transcriber.editor_comments to authenticated, service_role;
