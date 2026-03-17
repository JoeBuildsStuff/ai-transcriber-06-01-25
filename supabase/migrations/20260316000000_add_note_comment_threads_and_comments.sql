-- Add comment_threads and comments tables for note commenting (ai_transcriber schema).
-- document_id references notes(id). RLS enforces ownership via notes.user_id.

create table ai_transcriber.comment_threads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references ai_transcriber.notes(id) on delete cascade,
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

create table ai_transcriber.comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references ai_transcriber.comment_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comment_threads_document_id on ai_transcriber.comment_threads(document_id);
create index idx_comment_threads_document_updated on ai_transcriber.comment_threads(document_id, updated_at desc);
create index idx_comments_thread_id on ai_transcriber.comments(thread_id);
create index idx_comments_thread_created on ai_transcriber.comments(thread_id, created_at asc);

alter table ai_transcriber.comment_threads enable row level security;
alter table ai_transcriber.comments enable row level security;

create policy "comment_threads_owner_select" on ai_transcriber.comment_threads
  for select to authenticated
  using (
    exists (
      select 1 from ai_transcriber.notes n
      where n.id = comment_threads.document_id and n.user_id = (select auth.uid())
    )
  );

create policy "comment_threads_owner_insert" on ai_transcriber.comment_threads
  for insert to authenticated
  with check (
    exists (
      select 1 from ai_transcriber.notes n
      where n.id = comment_threads.document_id and n.user_id = (select auth.uid())
    )
  );

create policy "comment_threads_owner_update" on ai_transcriber.comment_threads
  for update to authenticated
  using (
    exists (
      select 1 from ai_transcriber.notes n
      where n.id = comment_threads.document_id and n.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from ai_transcriber.notes n
      where n.id = comment_threads.document_id and n.user_id = (select auth.uid())
    )
  );

create policy "comment_threads_owner_delete" on ai_transcriber.comment_threads
  for delete to authenticated
  using (
    exists (
      select 1 from ai_transcriber.notes n
      where n.id = comment_threads.document_id and n.user_id = (select auth.uid())
    )
  );

create policy "comments_owner_select" on ai_transcriber.comments
  for select to authenticated
  using (
    exists (
      select 1 from ai_transcriber.comment_threads t
      join ai_transcriber.notes n on n.id = t.document_id
      where t.id = comments.thread_id and n.user_id = (select auth.uid())
    )
  );

create policy "comments_owner_insert" on ai_transcriber.comments
  for insert to authenticated
  with check (
    exists (
      select 1 from ai_transcriber.comment_threads t
      join ai_transcriber.notes n on n.id = t.document_id
      where t.id = comments.thread_id and n.user_id = (select auth.uid())
    )
  );

create policy "comments_owner_update" on ai_transcriber.comments
  for update to authenticated
  using (
    exists (
      select 1 from ai_transcriber.comment_threads t
      join ai_transcriber.notes n on n.id = t.document_id
      where t.id = comments.thread_id and n.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from ai_transcriber.comment_threads t
      join ai_transcriber.notes n on n.id = t.document_id
      where t.id = comments.thread_id and n.user_id = (select auth.uid())
    )
  );

create policy "comments_owner_delete" on ai_transcriber.comments
  for delete to authenticated
  using (
    exists (
      select 1 from ai_transcriber.comment_threads t
      join ai_transcriber.notes n on n.id = t.document_id
      where t.id = comments.thread_id and n.user_id = (select auth.uid())
    )
  );

create or replace function ai_transcriber.create_note_comment_thread_with_root(
  p_document_id uuid,
  p_anchor_from integer,
  p_anchor_to integer,
  p_anchor_exact text,
  p_anchor_prefix text,
  p_anchor_suffix text,
  p_content text
)
returns table(thread_id uuid)
language plpgsql
security definer
set search_path = ai_transcriber, public
as $$
declare
  v_thread_id uuid;
begin
  insert into ai_transcriber.comment_threads (
    document_id,
    created_by,
    status,
    anchor_from,
    anchor_to,
    anchor_exact,
    anchor_prefix,
    anchor_suffix
  )
  values (
    p_document_id,
    (select auth.uid()),
    'unresolved',
    p_anchor_from,
    p_anchor_to,
    coalesce(p_anchor_exact, ''),
    coalesce(p_anchor_prefix, ''),
    coalesce(p_anchor_suffix, '')
  )
  returning id into v_thread_id;

  insert into ai_transcriber.comments (
    thread_id,
    user_id,
    content
  )
  values (
    v_thread_id,
    (select auth.uid()),
    p_content
  );

  return query select v_thread_id;
end;
$$;

create or replace function ai_transcriber.batch_update_note_comment_thread_anchors(
  p_document_id uuid,
  p_anchors jsonb,
  p_now timestamptz default now()
)
returns void
language sql
security definer
set search_path = ai_transcriber, public
as $$
  with payload as (
    select
      a.id,
      a.anchor_from,
      a.anchor_to,
      a.anchor_exact,
      a.anchor_prefix,
      a.anchor_suffix
    from jsonb_to_recordset(coalesce(p_anchors, '[]'::jsonb)) as a(
      id uuid,
      anchor_from integer,
      anchor_to integer,
      anchor_exact text,
      anchor_prefix text,
      anchor_suffix text
    )
    where a.anchor_from >= 1
      and a.anchor_to > a.anchor_from
  )
  update ai_transcriber.comment_threads as t
  set
    anchor_from = p.anchor_from,
    anchor_to = p.anchor_to,
    anchor_exact = coalesce(p.anchor_exact, t.anchor_exact),
    anchor_prefix = coalesce(p.anchor_prefix, t.anchor_prefix),
    anchor_suffix = coalesce(p.anchor_suffix, t.anchor_suffix),
    updated_at = p_now
  from payload as p
  where t.id = p.id
    and t.document_id = p_document_id;
$$;

grant execute on function ai_transcriber.create_note_comment_thread_with_root(uuid, integer, integer, text, text, text, text) to authenticated, service_role;
grant execute on function ai_transcriber.batch_update_note_comment_thread_anchors(uuid, jsonb, timestamptz) to authenticated, service_role;
