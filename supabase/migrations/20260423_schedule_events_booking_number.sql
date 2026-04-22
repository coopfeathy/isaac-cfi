-- Add a stable, human-friendly sequential booking number to schedule_events.
-- Uses a dedicated sequence starting at 1 so the first booking is BK-1.
-- Existing rows are backfilled in created_at order so numbering stays monotonic
-- even when the board mixes seed/demo rows with real new rows.

create sequence if not exists public.schedule_events_booking_number_seq start with 1;

alter table public.schedule_events
  add column if not exists booking_number bigint;

-- Backfill any existing rows in created_at order so older rows get lower numbers.
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.schedule_events
  where booking_number is null
)
update public.schedule_events s
set booking_number = ordered.rn
from ordered
where s.id = ordered.id;

-- Advance the sequence correctly whether or not any rows exist. If the table
-- is empty we leave is_called=false so the first nextval() returns 1; otherwise
-- we park the sequence at max(booking_number) with is_called=true so the next
-- nextval() is max+1.
do $$
declare
  max_n bigint;
begin
  select max(booking_number) into max_n from public.schedule_events;
  if max_n is null then
    perform setval('public.schedule_events_booking_number_seq', 1, false);
  else
    perform setval('public.schedule_events_booking_number_seq', max_n, true);
  end if;
end $$;

alter table public.schedule_events
  alter column booking_number set default nextval('public.schedule_events_booking_number_seq'),
  alter column booking_number set not null;

alter sequence public.schedule_events_booking_number_seq
  owned by public.schedule_events.booking_number;

create unique index if not exists schedule_events_booking_number_key
  on public.schedule_events (booking_number);
