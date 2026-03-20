-- Manual social media posts table for blog video feed
-- Run this in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.social_media_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'facebook')),
  url text not null,
  title text not null,
  thumbnail text,
  date timestamptz not null,
  type text not null check (type in ('video', 'image', 'carousel')),
  created_at timestamptz not null default now()
);

create index if not exists social_media_posts_date_idx
  on public.social_media_posts (date desc);

-- Keep RLS enabled; service-role reads from server side in this app
alter table public.social_media_posts enable row level security;

-- Admin policies for dashboard CRUD (client-side with authenticated admin users)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'social_media_posts'
      and policyname = 'Admins can view social media posts'
  ) then
    create policy "Admins can view social media posts"
      on public.social_media_posts for select
      using (
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'social_media_posts'
      and policyname = 'Admins can insert social media posts'
  ) then
    create policy "Admins can insert social media posts"
      on public.social_media_posts for insert
      with check (
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'social_media_posts'
      and policyname = 'Admins can update social media posts'
  ) then
    create policy "Admins can update social media posts"
      on public.social_media_posts for update
      using (
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
      )
      with check (
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'social_media_posts'
      and policyname = 'Admins can delete social media posts'
  ) then
    create policy "Admins can delete social media posts"
      on public.social_media_posts for delete
      using (
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
      );
  end if;
end
$$;

-- Optional: allow public read access if you ever query with anon key directly
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'social_media_posts'
      and policyname = 'Public can read social media posts'
  ) then
    create policy "Public can read social media posts"
      on public.social_media_posts
      for select
      using (true);
  end if;
end
$$;

-- Seed examples (safe to remove)
insert into public.social_media_posts (platform, url, title, thumbnail, date, type)
values
  (
    'youtube',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'Sample YouTube Training Video',
    'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    now() - interval '1 day',
    'video'
  ),
  (
    'instagram',
    'https://www.instagram.com/p/EXAMPLE/',
    'Sample Instagram Flight Clip',
    null,
    now() - interval '2 days',
    'video'
  )
on conflict do nothing;
