-- Fix: Allow public (anon) INSERT into prospects for form submissions.
-- Discovery flight signups and other public lead forms run without
-- authentication. Only INSERT is opened to anon;
-- SELECT / UPDATE / DELETE remain admin-only.
--
-- Run this once in Supabase SQL Editor → it is safe to run multiple times.

-- Normalize any legacy source values.
UPDATE prospects
SET source = 'discovery_flight'
WHERE source = 'onboarding_funnel';

-- Drop the old admin-only insert policy (if it exists)
DROP POLICY IF EXISTS "Admins can insert prospects" ON prospects;
DROP POLICY IF EXISTS "Public can insert prospects" ON prospects;

-- Allow public form submissions to insert a new prospect row.
-- The service-role API routes bypass RLS entirely, so this policy
-- affects only the anon-key path (direct form submissions / fallback).
CREATE POLICY "Public can insert prospects"
  ON prospects FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure the admin select/update/delete policies still exist.
-- These are safe to re-run (CREATE POLICY IF NOT EXISTS is not available
-- in older Postgres, so we drop-then-create to be idempotent).

DROP POLICY IF EXISTS "Admins can view all prospects" ON prospects;
CREATE POLICY "Admins can view all prospects"
  ON prospects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update prospects" ON prospects;
CREATE POLICY "Admins can update prospects"
  ON prospects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete prospects" ON prospects;
CREATE POLICY "Admins can delete prospects"
  ON prospects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
