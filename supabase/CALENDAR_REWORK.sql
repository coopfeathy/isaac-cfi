-- ============================================================
-- MERLIN FLIGHT TRAINING — CALENDAR REWORK MIGRATION
-- ============================================================
-- Run this file in your Supabase SQL Editor.
-- All DROP POLICY IF EXISTS guards make it safe to re-run.
-- Depends on: SETUP.sql (profiles, slots, bookings, slot_requests, prospects, syllabus_items tables)
-- Created: 2026-04-05
-- ============================================================

-- ============================================================
-- 1. INSTRUCTOR AVAILABILITY (weekly recurring schedule template)
-- ============================================================
CREATE TABLE IF NOT EXISTS instructor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT instructor_availability_time_check CHECK (end_time > start_time)
);

ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage instructor availability" ON instructor_availability;
DROP POLICY IF EXISTS "Authenticated users can view instructor availability" ON instructor_availability;

CREATE POLICY "Admins can manage instructor availability"
  ON instructor_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Authenticated users can view instructor availability"
  ON instructor_availability FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_instructor_availability_day_active
  ON instructor_availability(day_of_week, is_active);

-- ============================================================
-- 2. AVAILABILITY OVERRIDES (date-specific schedule changes)
-- ============================================================
CREATE TABLE IF NOT EXISTS availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  override_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false, -- false = block this date, true = add extra hours
  start_time TIME, -- NULL if is_available=false (means whole day blocked)
  end_time TIME,   -- NULL if is_available=false
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT override_time_check CHECK (
    (is_available = false) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage availability overrides" ON availability_overrides;
DROP POLICY IF EXISTS "Authenticated users can view availability overrides" ON availability_overrides;

CREATE POLICY "Admins can manage availability overrides"
  ON availability_overrides FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Authenticated users can view availability overrides"
  ON availability_overrides FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_availability_overrides_date
  ON availability_overrides(override_date);

-- ============================================================
-- 3. NOTIFICATION PREFERENCES (student email/SMS preferences)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Admins can view all notification preferences" ON notification_preferences;

CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification preferences"
  ON notification_preferences FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON notification_preferences(user_id);

-- ============================================================
-- 4. EXTEND SLOT_REQUESTS TABLE
-- ============================================================

-- Add new columns
ALTER TABLE slot_requests ADD COLUMN IF NOT EXISTS request_type TEXT NOT NULL DEFAULT 'discovery_flight'
  CHECK (request_type IN ('training', 'discovery_flight'));
ALTER TABLE slot_requests ADD COLUMN IF NOT EXISTS denial_reason TEXT;
ALTER TABLE slot_requests ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL;

-- Update status constraint to include 'canceled'
-- Drop the existing check constraint and recreate with the new value.
-- The constraint name in SETUP.sql is auto-generated; use the column check pattern.
DO $$
BEGIN
  -- Drop existing status check constraint(s) on slot_requests
  PERFORM 1 FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'slot_requests'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause LIKE '%status%';
  IF FOUND THEN
    EXECUTE (
      SELECT 'ALTER TABLE slot_requests DROP CONSTRAINT ' || quote_ident(tc.constraint_name)
      FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'slot_requests'
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause LIKE '%status%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE slot_requests ADD CONSTRAINT slot_requests_status_check
  CHECK (status IN ('pending', 'approved', 'denied', 'canceled'));

-- Add RLS policy for students to view their own slot requests
DROP POLICY IF EXISTS "Users can view their own slot requests" ON slot_requests;

CREATE POLICY "Users can view their own slot requests"
  ON slot_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for slot_requests new columns
CREATE INDEX IF NOT EXISTS idx_slot_requests_request_type_status
  ON slot_requests(request_type, status);
CREATE INDEX IF NOT EXISTS idx_slot_requests_prospect_id
  ON slot_requests(prospect_id);

-- ============================================================
-- 5. ADD SYLLABUS_LESSON_ID TO BOOKINGS
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS syllabus_lesson_id UUID REFERENCES syllabus_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_syllabus_lesson_id
  ON bookings(syllabus_lesson_id);

-- ============================================================
-- 6. ADD CALDAV COLUMNS TO SLOTS
-- ============================================================
ALTER TABLE slots ADD COLUMN IF NOT EXISTS caldav_uid TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS caldav_etag TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending_push'
  CHECK (sync_status IN ('synced', 'pending_push', 'pending_pull', 'pending_delete', 'conflict', 'error'));
ALTER TABLE slots ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_slots_caldav_uid
  ON slots(caldav_uid);
CREATE INDEX IF NOT EXISTS idx_slots_sync_status
  ON slots(sync_status);
