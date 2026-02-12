-- 1. Ensure table exists (basic structure)
create table if not exists prospect_information (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  current_step integer default 0
);

-- 2. Safely add columns (if they don't exist yet)
alter table prospect_information add column if not exists first_name text;
alter table prospect_information add column if not exists last_name text;
alter table prospect_information add column if not exists phone_number text;
alter table prospect_information add column if not exists dob date;
alter table prospect_information add column if not exists citizenship text;
alter table prospect_information add column if not exists training_objective text;
alter table prospect_information add column if not exists training_start_timeframe text;
alter table prospect_information add column if not exists is_for_someone_else boolean default false;
alter table prospect_information add column if not exists agree_to_sms boolean default false;

-- Step 2 Data
alter table prospect_information add column if not exists english_proficient text;
alter table prospect_information add column if not exists interested_in_instructing text;
alter table prospect_information add column if not exists medical_concerns text;
alter table prospect_information add column if not exists current_certificates text;
alter table prospect_information add column if not exists height_feet integer;
alter table prospect_information add column if not exists height_inches integer;
alter table prospect_information add column if not exists weight_lbs integer;

-- Step 3 Data
alter table prospect_information add column if not exists preferred_location text;

-- 3. Enable Row Level Security
alter table prospect_information enable row level security;

-- 4. Drop existing policies to avoid "already exists" error
drop policy if exists "Allow public insert to prospect_information" on prospect_information;
drop policy if exists "Allow public update to prospect_information" on prospect_information;
drop policy if exists "Allow public select from prospect_information" on prospect_information;

-- 5. Recreate Policies
create policy "Allow public insert to prospect_information"
on prospect_information for insert
with check (true);

create policy "Allow public update to prospect_information"
on prospect_information for update
using (true);

create policy "Allow public select from prospect_information"
on prospect_information for select
using (true);

-- 6. Index
create index if not exists idx_prospect_information_email on prospect_information(email);
