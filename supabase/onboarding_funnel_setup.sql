-- 1. Ensure table exists (basic structure)
create table if not exists onboarding_funnel (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  current_step integer default 0
);

-- 2. Safely add columns (if they don't exist yet)
alter table onboarding_funnel add column if not exists first_name text;
alter table onboarding_funnel add column if not exists last_name text;
alter table onboarding_funnel add column if not exists phone_number text;
alter table onboarding_funnel add column if not exists dob date;
alter table onboarding_funnel add column if not exists citizenship text;
alter table onboarding_funnel add column if not exists training_objective text;
alter table onboarding_funnel add column if not exists training_start_timeframe text;
alter table onboarding_funnel add column if not exists is_for_someone_else boolean default false;
alter table onboarding_funnel add column if not exists agree_to_sms boolean default false;

-- Step 2 Data
alter table onboarding_funnel add column if not exists english_proficient text;
alter table onboarding_funnel add column if not exists interested_in_instructing text;
alter table onboarding_funnel add column if not exists medical_concerns text;
alter table onboarding_funnel add column if not exists current_certificates text;
alter table onboarding_funnel add column if not exists height_feet integer;
alter table onboarding_funnel add column if not exists height_inches integer;
alter table onboarding_funnel add column if not exists weight_lbs integer;

-- Step 3 Data
alter table onboarding_funnel add column if not exists preferred_location text;

-- 3. Enable Row Level Security
alter table onboarding_funnel enable row level security;

-- 4. Drop existing policies to avoid "already exists" error
drop policy if exists "Allow public insert to onboarding_funnel" on onboarding_funnel;
drop policy if exists "Allow public update to onboarding_funnel" on onboarding_funnel;
drop policy if exists "Allow public select from onboarding_funnel" on onboarding_funnel;

-- 5. Recreate Policies
create policy "Allow public insert to onboarding_funnel"
on onboarding_funnel for insert
with check (true);

create policy "Allow public update to onboarding_funnel"
on onboarding_funnel for update
using (true);

create policy "Allow public select from onboarding_funnel"
on onboarding_funnel for select
using (true);

-- 6. Index
create index if not exists idx_onboarding_funnel_email on onboarding_funnel(email);
