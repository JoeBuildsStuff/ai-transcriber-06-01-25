-- Migration: Fix meeting_attendees foreign key constraint and migrate contact references
-- Purpose: Update contact_id references from old contacts table to new_contacts table
-- Affected tables: meeting_attendees
-- Special considerations: This migration maps old contact IDs to new contact IDs based on name and email matching

-- Step 1: Update contact_id references in meeting_attendees to use new_contacts IDs
-- This maps old contact IDs to new contact IDs based on matching names and emails
update ai_transcriber.meeting_attendees 
set contact_id = mapping.new_contact_id
from (
  select 
    c.id as old_contact_id,
    nc.id as new_contact_id
  from ai_transcriber.contacts c
  join ai_transcriber.new_contacts nc on (
    c.first_name = nc.first_name and 
    c.last_name = nc.last_name
  )
  join ai_transcriber.new_contact_emails nce on (
    nc.id = nce.contact_id and 
    nce.display_order = 0 and
    c.primary_email = nce.email
  )
) as mapping
where ai_transcriber.meeting_attendees.contact_id = mapping.old_contact_id;

-- Step 2: Remove any orphaned meeting attendees that couldn't be mapped
-- (This should be rare, but handles any edge cases)
delete from ai_transcriber.meeting_attendees 
where contact_id not in (
  select id from ai_transcriber.new_contacts
);

-- Step 3: Drop the existing foreign key constraint that points to the old contacts table
alter table ai_transcriber.meeting_attendees 
drop constraint if exists meeting_attendees_contact_id_fkey;

-- Step 4: Add the new foreign key constraint that points to the new_contacts table
alter table ai_transcriber.meeting_attendees 
add constraint meeting_attendees_contact_id_fkey 
foreign key (contact_id) 
references ai_transcriber.new_contacts(id) 
on delete cascade;

-- Step 5: Add comment explaining the change
comment on constraint meeting_attendees_contact_id_fkey on ai_transcriber.meeting_attendees 
is 'Foreign key constraint linking meeting attendees to the new_contacts table'; 