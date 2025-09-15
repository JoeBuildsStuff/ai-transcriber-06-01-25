-- migration_metadata:
--   purpose: Create normalized chat schema that mirrors the in-memory chat store
--   affected_tables: ai_transcriber.chat_sessions, ai_transcriber.chat_messages,
--                    ai_transcriber.chat_attachments, ai_transcriber.chat_tool_calls,
--                    ai_transcriber.chat_suggested_actions, ai_transcriber.chat_branch_state
--   special_considerations: RLS enabled for all tables; helper functions for ownership checks

-- Create enums for roles and action types (idempotent guard)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'chat_role') then
    create type ai_transcriber.chat_role as enum ('user','assistant','system');
  end if;
  if not exists (select 1 from pg_type where typname = 'chat_action_type') then
    create type ai_transcriber.chat_action_type as enum ('filter','sort','navigate','create','function_call');
  end if;
end $$;

-- Sessions
create table if not exists ai_transcriber.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null default 'New Chat',
  context jsonb null, -- serialized PageContext snapshot
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx on ai_transcriber.chat_sessions(user_id);
create index if not exists chat_sessions_updated_at_idx on ai_transcriber.chat_sessions(updated_at desc);

-- Messages (conversation graph with optional branching)
create table if not exists ai_transcriber.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ai_transcriber.chat_sessions(id) on delete cascade,
  parent_id uuid null references ai_transcriber.chat_messages(id) on delete set null, -- previous message in the chosen branch
  role ai_transcriber.chat_role not null,
  content text not null default '',
  reasoning text null,
  context jsonb null,             -- message-level context snapshot
  function_result jsonb null,     -- { success, data, error }
  citations jsonb null,           -- array of { url, title, cited_text }
  root_user_message_id uuid null references ai_transcriber.chat_messages(id) on delete set null, -- branch root
  variant_group_id uuid null,     -- group multiple assistant variants to the same user prompt
  variant_index int not null default 0,
  created_at timestamptz not null default now(),
  seq bigint generated always as identity -- convenient ordering when linearizing
);

create index if not exists chat_messages_session_id_idx on ai_transcriber.chat_messages(session_id);
create index if not exists chat_messages_parent_id_idx on ai_transcriber.chat_messages(parent_id);
create index if not exists chat_messages_root_idx on ai_transcriber.chat_messages(root_user_message_id);
create index if not exists chat_messages_variant_group_idx on ai_transcriber.chat_messages(variant_group_id);

-- Attachments (store only storage path/metadata; image/file bytes live in Supabase Storage)
create table if not exists ai_transcriber.chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references ai_transcriber.chat_messages(id) on delete cascade,
  name text not null,
  mime_type text not null,
  size bigint not null,
  storage_path text not null,  -- e.g., {user_id}/notes/{timestamp}-{filename}
  width int null,
  height int null,
  created_at timestamptz not null default now()
);

create index if not exists chat_attachments_message_id_idx on ai_transcriber.chat_attachments(message_id);

-- Tool calls (function/tool usage emitted by the model)
create table if not exists ai_transcriber.chat_tool_calls (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references ai_transcriber.chat_messages(id) on delete cascade,
  name text not null,
  arguments jsonb not null,
  result jsonb null,            -- { success, data, error }
  reasoning text null,
  created_at timestamptz not null default now()
);

create index if not exists chat_tool_calls_message_id_idx on ai_transcriber.chat_tool_calls(message_id);
create index if not exists chat_tool_calls_name_idx on ai_transcriber.chat_tool_calls(name);

-- Suggested actions (buttons the assistant proposes)
create table if not exists ai_transcriber.chat_suggested_actions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references ai_transcriber.chat_messages(id) on delete cascade,
  type ai_transcriber.chat_action_type not null,
  label text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_actions_message_id_idx on ai_transcriber.chat_suggested_actions(message_id);

-- Branch state (per-session selection of the active variant for a user message)
create table if not exists ai_transcriber.chat_branch_state (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references ai_transcriber.chat_sessions(id) on delete cascade,
  user_message_id uuid not null references ai_transcriber.chat_messages(id) on delete cascade,
  signature text null,            -- signature of the user message content
  active_index int not null default 0,
  signatures text[] null,         -- optional: maintain list of variant signatures
  updated_at timestamptz not null default now(),
  unique(session_id, user_message_id)
);

create index if not exists chat_branch_state_session_idx on ai_transcriber.chat_branch_state(session_id);

-- Enable RLS
alter table ai_transcriber.chat_sessions enable row level security;
alter table ai_transcriber.chat_messages enable row level security;
alter table ai_transcriber.chat_attachments enable row level security;
alter table ai_transcriber.chat_tool_calls enable row level security;
alter table ai_transcriber.chat_suggested_actions enable row level security;
alter table ai_transcriber.chat_branch_state enable row level security;

-- Helper: ownership checks
create or replace function ai_transcriber.is_session_owner(p_session_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from ai_transcriber.chat_sessions s
    where s.id = p_session_id and s.user_id = auth.uid()
  );
$$;

create or replace function ai_transcriber.is_message_owner(p_message_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1
    from ai_transcriber.chat_messages m
    join ai_transcriber.chat_sessions s on s.id = m.session_id
    where m.id = p_message_id and s.user_id = auth.uid()
  );
$$;

-- RLS policies
-- Sessions
create policy if not exists "Chat: select own sessions" on ai_transcriber.chat_sessions
  for select to authenticated
  using (user_id = auth.uid());

create policy if not exists "Chat: insert own sessions" on ai_transcriber.chat_sessions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy if not exists "Chat: update own sessions" on ai_transcriber.chat_sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy if not exists "Chat: delete own sessions" on ai_transcriber.chat_sessions
  for delete to authenticated
  using (user_id = auth.uid());

-- Messages
create policy if not exists "Chat: select messages in own sessions" on ai_transcriber.chat_messages
  for select to authenticated
  using (ai_transcriber.is_session_owner(session_id));

create policy if not exists "Chat: insert messages in own sessions" on ai_transcriber.chat_messages
  for insert to authenticated
  with check (ai_transcriber.is_session_owner(session_id));

create policy if not exists "Chat: update messages in own sessions" on ai_transcriber.chat_messages
  for update to authenticated
  using (ai_transcriber.is_session_owner(session_id))
  with check (ai_transcriber.is_session_owner(session_id));

create policy if not exists "Chat: delete messages in own sessions" on ai_transcriber.chat_messages
  for delete to authenticated
  using (ai_transcriber.is_session_owner(session_id));

-- Attachments
create policy if not exists "Chat: select own attachments" on ai_transcriber.chat_attachments
  for select to authenticated
  using (ai_transcriber.is_message_owner(message_id));

create policy if not exists "Chat: insert own attachments" on ai_transcriber.chat_attachments
  for insert to authenticated
  with check (ai_transcriber.is_message_owner(message_id));

create policy if not exists "Chat: delete own attachments" on ai_transcriber.chat_attachments
  for delete to authenticated
  using (ai_transcriber.is_message_owner(message_id));

-- Tool calls
create policy if not exists "Chat: select own tool calls" on ai_transcriber.chat_tool_calls
  for select to authenticated
  using (ai_transcriber.is_message_owner(message_id));

create policy if not exists "Chat: insert own tool calls" on ai_transcriber.chat_tool_calls
  for insert to authenticated
  with check (ai_transcriber.is_message_owner(message_id));

-- Suggested actions
create policy if not exists "Chat: select own actions" on ai_transcriber.chat_suggested_actions
  for select to authenticated
  using (ai_transcriber.is_message_owner(message_id));

create policy if not exists "Chat: insert own actions" on ai_transcriber.chat_suggested_actions
  for insert to authenticated
  with check (ai_transcriber.is_message_owner(message_id));

-- Branch state
create policy if not exists "Chat: select own branch state" on ai_transcriber.chat_branch_state
  for select to authenticated
  using (ai_transcriber.is_session_owner(session_id));

create policy if not exists "Chat: upsert own branch state" on ai_transcriber.chat_branch_state
  for insert to authenticated
  with check (ai_transcriber.is_session_owner(session_id));

create policy if not exists "Chat: update own branch state" on ai_transcriber.chat_branch_state
  for update to authenticated
  using (ai_transcriber.is_session_owner(session_id))
  with check (ai_transcriber.is_session_owner(session_id));

-- Triggers to keep updated_at fresh
-- Reuse project-wide helper if present
do $$
begin
  -- ensure trigger function exists (created in earlier migrations)
  perform 1 from pg_proc where proname = 'handle_updated_at' and pronamespace = 'ai_transcriber'::regnamespace;
  exception when undefined_object then
    create or replace function ai_transcriber.handle_updated_at()
    returns trigger as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$ language plpgsql;
end $$;

-- Session updated_at on updates
drop trigger if exists trg_chat_sessions_updated_at on ai_transcriber.chat_sessions;
create trigger trg_chat_sessions_updated_at
  before update on ai_transcriber.chat_sessions
  for each row execute function ai_transcriber.handle_updated_at();

-- Bump session.updated_at whenever messages change
create or replace function ai_transcriber.touch_session_on_message_change()
returns trigger as $$
begin
  update ai_transcriber.chat_sessions
    set updated_at = now()
  where id = coalesce(new.session_id, old.session_id);
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_session_on_message_insert on ai_transcriber.chat_messages;
create trigger trg_touch_session_on_message_insert
  after insert or update or delete on ai_transcriber.chat_messages
  for each row execute function ai_transcriber.touch_session_on_message_change();

