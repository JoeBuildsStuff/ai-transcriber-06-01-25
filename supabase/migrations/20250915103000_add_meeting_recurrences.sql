-- migration_metadata:
--   purpose: normalize meeting recurrence storage into dedicated table
--   affected_tables: ai_transcriber.meetings, ai_transcriber.meeting_recurrences
--   special_considerations: drops existing meetings.recurrence values; back up data if needed

-- Define helper enums for recurrence rules
create type ai_transcriber.meeting_recurrence_frequency as enum ('day', 'week', 'month', 'year');
create type ai_transcriber.meeting_recurrence_end_type as enum ('never', 'on', 'after');
create type ai_transcriber.meeting_recurrence_monthly_option as enum ('day', 'weekday');

-- Table to store structured recurrence rules for meetings
create table ai_transcriber.meeting_recurrences (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references ai_transcriber.meetings(id) on delete cascade,
  frequency ai_transcriber.meeting_recurrence_frequency not null,
  interval integer not null default 1 check (interval > 0),
  weekdays text[] null,
  monthly_option ai_transcriber.meeting_recurrence_monthly_option null,
  monthly_day_of_month smallint null,
  monthly_weekday text null,
  monthly_weekday_position smallint null,
  end_type ai_transcriber.meeting_recurrence_end_type not null default 'never',
  end_date date null,
  occurrence_count integer null,
  starts_at timestamptz not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meeting_recurrences_weekdays_valid check (weekdays is null or weekdays <@ array['su','m','t','w','th','f','sa']),
  constraint meeting_recurrences_weekdays_required check (
    frequency <> 'week' or (weekdays is not null and array_length(weekdays, 1) > 0)
  ),
  constraint meeting_recurrences_monthly_requirements check (
    frequency <> 'month'
    or (
      (monthly_option = 'day' and monthly_day_of_month between 1 and 31)
      or (
        monthly_option = 'weekday'
        and monthly_weekday_position between 1 and 5
        and monthly_weekday is not null
        and monthly_weekday in ('su', 'm', 't', 'w', 'th', 'f', 'sa')
      )
    )
  ),
  constraint meeting_recurrences_end_fields check (
    (end_type = 'never' and end_date is null and occurrence_count is null)
    or (end_type = 'on' and end_date is not null and occurrence_count is null)
    or (end_type = 'after' and occurrence_count is not null and occurrence_count > 0 and end_date is null)
  ),
  constraint meeting_recurrences_unique_meeting unique (meeting_id)
);

create index meeting_recurrences_meeting_id_idx
  on ai_transcriber.meeting_recurrences (meeting_id);

comment on table ai_transcriber.meeting_recurrences is 'Stores normalized recurrence rules for meetings';
comment on column ai_transcriber.meeting_recurrences.frequency is 'Recurrence frequency (day, week, month, year)';
comment on column ai_transcriber.meeting_recurrences.interval is 'Repeat interval multiplier (e.g., every 2 weeks)';
comment on column ai_transcriber.meeting_recurrences.weekdays is 'Weekday abbreviations (su, m, t, w, th, f, sa) for weekly recurrences';
comment on column ai_transcriber.meeting_recurrences.monthly_option is 'Whether monthly recurrence follows day of month or weekday pattern';
comment on column ai_transcriber.meeting_recurrences.end_type is 'Whether the recurrence ends never, on a date, or after N occurrences';
comment on column ai_transcriber.meeting_recurrences.starts_at is 'Initial occurrence datetime used as recurrence anchor';
comment on column ai_transcriber.meeting_recurrences.timezone is 'IANA timezone identifier used to interpret recurrence boundary dates';

-- Keep timestamps in sync automatically
create or replace function ai_transcriber.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger meeting_recurrences_set_updated_at
before update on ai_transcriber.meeting_recurrences
for each row
execute function ai_transcriber.set_updated_at();

-- Apply row level security policies aligned with meeting ownership
alter table ai_transcriber.meeting_recurrences enable row level security;

drop policy if exists "Meeting recurrence: select own" on ai_transcriber.meeting_recurrences;
drop policy if exists "Meeting recurrence: insert own" on ai_transcriber.meeting_recurrences;
drop policy if exists "Meeting recurrence: update own" on ai_transcriber.meeting_recurrences;
drop policy if exists "Meeting recurrence: delete own" on ai_transcriber.meeting_recurrences;

create policy "Meeting recurrence: select own" on ai_transcriber.meeting_recurrences
for select using (
  exists (
    select 1 from ai_transcriber.meetings m
    where m.id = meeting_id and m.user_id = auth.uid()
  )
);

create policy "Meeting recurrence: insert own" on ai_transcriber.meeting_recurrences
for insert with check (
  exists (
    select 1 from ai_transcriber.meetings m
    where m.id = meeting_id and m.user_id = auth.uid()
  )
);

create policy "Meeting recurrence: update own" on ai_transcriber.meeting_recurrences
for update using (
  exists (
    select 1 from ai_transcriber.meetings m
    where m.id = meeting_id and m.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from ai_transcriber.meetings m
    where m.id = meeting_id and m.user_id = auth.uid()
  )
);

create policy "Meeting recurrence: delete own" on ai_transcriber.meeting_recurrences
for delete using (
  exists (
    select 1 from ai_transcriber.meetings m
    where m.id = meeting_id and m.user_id = auth.uid()
  )
);

-- Remove the legacy json recurrence column now that data is normalized
alter table ai_transcriber.meetings
  drop column if exists recurrence;
