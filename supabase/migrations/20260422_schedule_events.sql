-- schedule_events
--
-- Dedicated table for the internal ops console schedule board. Each row is one
-- assignment of an aircraft + (optional) instructor + (optional) student to a
-- time window. Independent of the public-facing `slots`/`bookings` flow so
-- internal scheduling can move ahead without disrupting student-facing booking.

create table if not exists public.schedule_events (
  id             uuid primary key default gen_random_uuid(),
  aircraft_id    uuid references public.aircraft(id) on delete cascade,
  instructor_id  uuid references public.profiles(id) on delete set null,
  student_id     uuid references public.students(id) on delete set null,
  -- Free-text lesson label (e.g. "PPL-12 S-Turns"). Later this can point at
  -- syllabus_lessons when the ops console needs that structure.
  lesson         text,
  -- Free-text student label for rows where we don't yet have a students.id
  -- (e.g. maintenance/AOG rows, or prospects pre-conversion).
  student_label  text,
  start_time     timestamptz not null,
  end_time       timestamptz not null,
  status         text        not null default 'booked'
                 check (status in ('booked','in_flight','completed','pending','maint','aog','canceled')),
  paid           boolean,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles(id) on delete set null,
  constraint schedule_events_time_valid check (end_time > start_time)
);

create index if not exists schedule_events_aircraft_time_idx
  on public.schedule_events (aircraft_id, start_time);

create index if not exists schedule_events_instructor_time_idx
  on public.schedule_events (instructor_id, start_time);

create index if not exists schedule_events_start_idx
  on public.schedule_events (start_time);

-- Keep updated_at honest.
create or replace function public.set_schedule_events_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists schedule_events_set_updated_at on public.schedule_events;
create trigger schedule_events_set_updated_at
  before update on public.schedule_events
  for each row execute function public.set_schedule_events_updated_at();

-- RLS: admins manage, instructors can read their own rows, everyone else denied.
alter table public.schedule_events enable row level security;

drop policy if exists "Admins manage schedule_events" on public.schedule_events;
create policy "Admins manage schedule_events"
  on public.schedule_events
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Instructors read their own schedule_events" on public.schedule_events;
create policy "Instructors read their own schedule_events"
  on public.schedule_events
  for select
  using (instructor_id = auth.uid());
