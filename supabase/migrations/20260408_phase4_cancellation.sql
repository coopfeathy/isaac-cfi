-- Phase 4: Cancellation flow — atomic booking cancellation and fee tracking
-- Migration: 20260408_phase4_cancellation.sql

-- 1. cancellation_fee_flags table
--    Tracks $50 cancellation fees that could not be charged immediately
--    (e.g. no card on file). Admin resolves these manually or via payment link.

CREATE TABLE IF NOT EXISTS cancellation_fee_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL DEFAULT 5000,
  reason TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cancellation_fee_flags ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all fee flags
CREATE POLICY "Admins can manage cancellation fee flags"
  ON cancellation_fee_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Service role (API routes using supabase-admin) can manage flags
CREATE POLICY "Service role manages cancellation fee flags"
  ON cancellation_fee_flags FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for efficient admin queries: show unresolved flags per student
CREATE INDEX IF NOT EXISTS idx_cancellation_fee_flags_student
  ON cancellation_fee_flags(student_id, resolved);


-- 2. cancel_booking_atomic RPC
--    Atomically cancels a booking and releases the associated slot.
--    Uses FOR UPDATE row locking and SECURITY DEFINER to bypass RLS.
--    Validates ownership (p_user_id) and cancellable status before updating.
--    Returns JSONB: { ok: true, slot_id } on success, or { error, ... } on failure.

CREATE OR REPLACE FUNCTION cancel_booking_atomic(p_booking_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_slot_id UUID;
  v_current_status TEXT;
BEGIN
  -- Lock the booking row to prevent concurrent cancellations/modifications
  SELECT slot_id, status INTO v_slot_id, v_current_status
  FROM bookings
  WHERE id = p_booking_id AND user_id = p_user_id
  FOR UPDATE;

  -- Booking not found or does not belong to the requesting user
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'booking_not_found');
  END IF;

  -- Only allow cancellation of bookings in an active state
  IF v_current_status NOT IN ('pending_approval', 'confirmed', 'paid') THEN
    RETURN jsonb_build_object('error', 'booking_not_cancellable', 'status', v_current_status);
  END IF;

  -- Atomic update: cancel booking AND release slot in the same transaction
  UPDATE bookings SET status = 'canceled' WHERE id = p_booking_id;
  UPDATE slots SET is_booked = false WHERE id = v_slot_id;

  RETURN jsonb_build_object('ok', true, 'slot_id', v_slot_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
