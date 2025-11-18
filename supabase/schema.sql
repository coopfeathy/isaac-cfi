-- Merlin Flight Training - Supabase Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase Auth users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  phone text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Available slots for scheduling
create table slots (
  id uuid primary key default gen_random_uuid(),
  start_time timestamptz not null,
  end_time timestamptz not null,
  type text not null check (type in ('training', 'tour')),
  price integer not null, -- in cents
  created_at timestamptz default now(),
  is_booked boolean default false,
  description text
);

-- Enable Row Level Security
alter table slots enable row level security;

-- Policies for slots
create policy "Slots are viewable by everyone"
  on slots for select
  using (true);

create policy "Only admins can insert slots"
  on slots for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Only admins can update slots"
  on slots for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Only admins can delete slots"
  on slots for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Bookings created by users
create table bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references slots(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'paid', 'confirmed', 'canceled', 'completed')),
  stripe_session_id text,
  created_at timestamptz default now(),
  notes text
);

-- Enable Row Level Security
alter table bookings enable row level security;

-- Policies for bookings
create policy "Users can view their own bookings"
  on bookings for select
  using (auth.uid() = user_id);

create policy "Admins can view all bookings"
  on bookings for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Users can insert their own bookings"
  on bookings for insert
  with check (auth.uid() = user_id);

create policy "Admins can update any booking"
  on bookings for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Blog posts (optional - can also use markdown files)
create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  content text,
  excerpt text,
  published boolean default false,
  author_id uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table posts enable row level security;

-- Policies for posts
create policy "Published posts are viewable by everyone"
  on posts for select
  using (published = true);

create policy "Admins can view all posts"
  on posts for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can create posts"
  on posts for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can update posts"
  on posts for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Indexes for better performance
create index idx_slots_start_time on slots(start_time);
create index idx_slots_is_booked on slots(is_booked);
create index idx_bookings_user_id on bookings(user_id);
create index idx_bookings_status on bookings(status);
create index idx_posts_slug on posts(slug);
create index idx_posts_published on posts(published);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for posts
create trigger update_posts_updated_at
  before update on posts
  for each row
  execute function update_updated_at_column();
