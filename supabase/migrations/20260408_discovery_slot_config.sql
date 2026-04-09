-- Migration: discovery_slot_config
-- Phase 2 Plan 02 (ADMIN-07) — Admin-managed discovery flight schedule
-- Replaces hard-coded env var reads with a DB row that the admin can update via /admin

CREATE TABLE IF NOT EXISTS discovery_slot_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  active_weekdays text NOT NULL DEFAULT '0,6',
  template_times text NOT NULL DEFAULT '10:00,14:00',
  duration_minutes integer NOT NULL DEFAULT 90,
  price_cents integer NOT NULL DEFAULT 25000,
  generation_days_ahead integer NOT NULL DEFAULT 30,
  min_days_out integer NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default row if none exists
INSERT INTO discovery_slot_config (active_weekdays, template_times, duration_minutes, price_cents, generation_days_ahead, min_days_out)
SELECT '0,6', '10:00,14:00', 90, 25000, 30, 1
WHERE NOT EXISTS (SELECT 1 FROM discovery_slot_config);

-- RLS: only admins can read/write (T-02-11 mitigation)
ALTER TABLE discovery_slot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage discovery slot config" ON discovery_slot_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
