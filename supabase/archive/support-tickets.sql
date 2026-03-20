-- Support Tickets Table
-- Run this in your Supabase SQL editor to create the support_tickets table

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  category TEXT NOT NULL CHECK (category IN ('scheduling', 'billing', 'training', 'medical', 'aircraft', 'other')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form submissions)
CREATE POLICY "Anyone can submit a support ticket"
  ON support_tickets
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins (service role) can read tickets
CREATE POLICY "Admins can view support tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_tickets_updated_at();

-- Index for quickly listing by status and date
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_email_idx ON support_tickets (email);
