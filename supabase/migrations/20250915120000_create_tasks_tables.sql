-- Migration: Create tasks tables and relationships
-- Purpose: Introduce task tracking with optional associations to meetings, contacts, notes, and tags
-- Date: 2025-09-15

-- Create enums for task priority and status if they do not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'task_priority'
      AND typnamespace = 'ai_transcriber'::regnamespace
  ) THEN
    CREATE TYPE ai_transcriber.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'task_status'
      AND typnamespace = 'ai_transcriber'::regnamespace
  ) THEN
    CREATE TYPE ai_transcriber.task_status AS ENUM ('todo', 'in_progress', 'blocked', 'completed', 'cancelled');
  END IF;
END
$$;

-- Main tasks table
CREATE TABLE ai_transcriber.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority ai_transcriber.task_priority NOT NULL DEFAULT 'medium',
  status ai_transcriber.task_status NOT NULL DEFAULT 'todo',
  start_at timestamptz,
  due_at timestamptz,
  owner_contact_id uuid REFERENCES ai_transcriber.new_contacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_user_id_idx ON ai_transcriber.tasks(user_id);
CREATE INDEX tasks_status_idx ON ai_transcriber.tasks(status);
CREATE INDEX tasks_priority_idx ON ai_transcriber.tasks(priority);
CREATE INDEX tasks_owner_contact_id_idx ON ai_transcriber.tasks(owner_contact_id);
CREATE INDEX tasks_due_at_idx ON ai_transcriber.tasks(due_at DESC NULLS LAST);

-- Junction table for associating tasks with meetings (many-to-many)
CREATE TABLE ai_transcriber.task_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES ai_transcriber.tasks(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES ai_transcriber.meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, meeting_id)
);

CREATE INDEX task_meetings_task_id_idx ON ai_transcriber.task_meetings(task_id);
CREATE INDEX task_meetings_meeting_id_idx ON ai_transcriber.task_meetings(meeting_id);
CREATE INDEX task_meetings_user_id_idx ON ai_transcriber.task_meetings(user_id);

-- Junction table for associating tasks with contacts (many-to-many)
CREATE TABLE ai_transcriber.task_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES ai_transcriber.tasks(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES ai_transcriber.new_contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, contact_id)
);

CREATE INDEX task_contacts_task_id_idx ON ai_transcriber.task_contacts(task_id);
CREATE INDEX task_contacts_contact_id_idx ON ai_transcriber.task_contacts(contact_id);
CREATE INDEX task_contacts_user_id_idx ON ai_transcriber.task_contacts(user_id);

-- Junction table for associating tasks with notes (many-to-many)
CREATE TABLE ai_transcriber.task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES ai_transcriber.tasks(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES ai_transcriber.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, note_id)
);

CREATE INDEX task_notes_task_id_idx ON ai_transcriber.task_notes(task_id);
CREATE INDEX task_notes_note_id_idx ON ai_transcriber.task_notes(note_id);
CREATE INDEX task_notes_user_id_idx ON ai_transcriber.task_notes(user_id);

-- Junction table for associating tasks with tags (many-to-many)
CREATE TABLE ai_transcriber.task_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES ai_transcriber.tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES ai_transcriber.tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, tag_id)
);

CREATE INDEX task_tags_task_id_idx ON ai_transcriber.task_tags(task_id);
CREATE INDEX task_tags_tag_id_idx ON ai_transcriber.task_tags(tag_id);
CREATE INDEX task_tags_user_id_idx ON ai_transcriber.task_tags(user_id);

-- Ensure updated_at on tasks stays current
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON ai_transcriber.tasks
  FOR EACH ROW
  EXECUTE FUNCTION ai_transcriber.update_updated_at_column();

-- Enable row level security
ALTER TABLE ai_transcriber.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_transcriber.task_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_transcriber.task_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_transcriber.task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_transcriber.task_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Users can view their own tasks" ON ai_transcriber.tasks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own tasks" ON ai_transcriber.tasks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tasks" ON ai_transcriber.tasks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own tasks" ON ai_transcriber.tasks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS policies for junction tables
CREATE POLICY "Users can view their own task meetings" ON ai_transcriber.task_meetings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can modify their own task meetings" ON ai_transcriber.task_meetings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own task contacts" ON ai_transcriber.task_contacts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can modify their own task contacts" ON ai_transcriber.task_contacts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own task notes" ON ai_transcriber.task_notes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can modify their own task notes" ON ai_transcriber.task_notes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own task tags" ON ai_transcriber.task_tags
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can modify their own task tags" ON ai_transcriber.task_tags
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
