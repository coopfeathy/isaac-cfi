-- Discovery Flight Signups Table
-- Run this SQL in your Supabase SQL Editor to create the table for saving emails

-- Create table
create table if not exists discovery_flight_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table discovery_flight_signups enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Authenticated users can view signups" on discovery_flight_signups;
drop policy if exists "Anyone can insert signups" on discovery_flight_signups;

-- Policies for discovery_flight_signups
-- Allow any authenticated user to view (admins will be authenticated)
create policy "Authenticated users can view signups"
on discovery_flight_signups for select
using (auth.uid() is not null);

-- Allow anyone to insert signups (needed for public signup form)
create policy "Anyone can insert signups"
on discovery_flight_signups for insert
with check (true);

-- Drop existing indexes if they exist
drop index if exists idx_discovery_signups_email;
drop index if exists idx_discovery_signups_created_at;

-- Create indexes for better performance
create index if not exists idx_discovery_signups_email on discovery_flight_signups(email);
create index if not exists idx_discovery_signups_created_at on discovery_flight_signups(created_at desc);
