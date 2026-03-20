# Master Guide

This is the primary documentation entry point for this project.

## Admin Workspace

- Use `/admin` as the control center.
- Each function now opens in a focused workspace instead of a crowded tab strip.
- Core functions: slots, bookings, leads, blog, social, email campaigns.

## Setup Order

1. Supabase schema: run `supabase/MASTER_SETUP.sql`.
2. Prospect migration (if consolidating old tables): run `supabase/migrate-to-prospects-schema.sql`.
3. Configure environment variables from `.env.example`.
4. Verify admin role in `profiles.is_admin`.

## Email + Leads

- Funnel leads are consolidated into `prospects`.
- Discovery funnel API steps update the same prospect record.
- Notes are merged by step so data is not overwritten.

## Social Posts

- Blog page reads from `social_media_posts`.
- Ensure public read policy exists for stable public rendering.

## Archived Docs

All older topic-specific docs have been moved to `docs/archive/` for reference.
