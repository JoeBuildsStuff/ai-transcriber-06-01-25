-- migration_metadata:
--   purpose: add openai_response column to meetings table
--   affected_tables: ai_transcriber.meetings
--   special_considerations: none

-- add the new column openai_response to the meetings table
alter table ai_transcriber.meetings
add column openai_response jsonb null;

-- comment on the new column
comment on column ai_transcriber.meetings.openai_response is 'stores the full json response from the openai api for summarization'; 