-- migration_metadata:
--   purpose: add title column to meetings table
--   affected_tables: ai_transcriber.meetings
--   special_considerations: none

-- add the new column title to the meetings table
alter table ai_transcriber.meetings
add column title text null;

-- comment on the new column
comment on column ai_transcriber.meetings.title is 'stores the meeting title, can be AI-generated or user-defined'; 