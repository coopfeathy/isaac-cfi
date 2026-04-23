-- Add a persisted `hobbs` reading to the aircraft table so the ops console's
-- Fleet editor (tach/hobbs input on the aircraft detail modal) survives a
-- refresh. Prior to this the UI tracked hobbs in memory only and resets to 0.0
-- on reload.

alter table public.aircraft
  add column if not exists hobbs numeric(10, 1) not null default 0;
