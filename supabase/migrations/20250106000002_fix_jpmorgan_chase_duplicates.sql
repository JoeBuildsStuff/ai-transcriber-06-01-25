-- Migration: Fix JPMorgan Chase duplicates in new_companies table
-- Purpose: Consolidate duplicate JPMorgan Chase company entries into a single canonical entry
-- Affected tables: ai_transcriber.new_companies, ai_transcriber.new_contacts
-- Created: 2025-01-06

-- Step 1: Identify the canonical JPMorgan Chase company entry
-- We'll use the entry with the most contacts and earliest creation date
-- Canonical ID: 47eb7723-43bc-4a35-a8a6-029127008738 (JPMorganChase)
-- Duplicate IDs: 
--   - 902e9f5a-af58-4a23-a020-7100c9c6b2b5 (JP Morgan)
--   - fb4988e3-e1c6-400c-b6d8-b0921786c894 (JPMorgan Chase)

-- Step 2: Update all contacts to point to the canonical company
-- This ensures all JPMorgan Chase contacts are associated with the same company entry
update ai_transcriber.new_contacts 
set company_id = '47eb7723-43bc-4a35-a8a6-029127008738'::uuid
where company_id in (
    '902e9f5a-af58-4a23-a020-7100c9c6b2b5'::uuid,  -- JP Morgan
    'fb4988e3-e1c6-400c-b6d8-b0921786c894'::uuid   -- JPMorgan Chase
);

-- Step 3: Delete the duplicate company entries
-- WARNING: This is a destructive operation that removes duplicate company records
-- Only proceed after ensuring all contacts have been updated to point to the canonical entry
delete from ai_transcriber.new_companies 
where id in (
    '902e9f5a-af58-4a23-a020-7100c9c6b2b5'::uuid,  -- JP Morgan
    'fb4988e3-e1c6-400c-b6d8-b0921786c894'::uuid   -- JPMorgan Chase
);

-- Step 4: Verify the consolidation was successful
-- This query should return only one JPMorgan Chase company entry
-- and all contacts should be associated with it
do $$
declare
    company_count integer;
    contact_count integer;
begin
    -- Check that only one JPMorgan Chase company remains
    select count(*) into company_count
    from ai_transcriber.new_companies 
    where name ilike '%JPMorgan%' or name ilike '%JP Morgan%' or name ilike '%Chase%';
    
    if company_count != 1 then
        raise exception 'Expected 1 JPMorgan Chase company after consolidation, found %', company_count;
    end if;
    
    -- Check that all contacts are properly associated
    select count(*) into contact_count
    from ai_transcriber.new_contacts nc
    join ai_transcriber.new_companies comp on nc.company_id = comp.id
    where comp.name ilike '%JPMorgan%' or comp.name ilike '%JP Morgan%' or comp.name ilike '%Chase%';
    
    if contact_count != 61 then
        raise exception 'Expected 61 JPMorgan Chase contacts after consolidation, found %', contact_count;
    end if;
    
    raise notice 'JPMorgan Chase consolidation successful: 1 company, % contacts', contact_count;
end $$;
