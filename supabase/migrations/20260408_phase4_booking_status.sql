-- Phase 4: Add pending_approval status to bookings table
-- The bookings.status column is TEXT with a CHECK constraint (not a native ENUM).
-- We drop the old constraint and add a new one that includes 'pending_approval'.

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'paid', 'confirmed', 'canceled', 'completed', 'pending_approval'));
