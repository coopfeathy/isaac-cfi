-- Phase 4 Plan 04: Invoice migration
-- Adds stripe_invoice_id column to bookings for tracking Stripe invoices

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_invoice_id ON bookings(stripe_invoice_id);
