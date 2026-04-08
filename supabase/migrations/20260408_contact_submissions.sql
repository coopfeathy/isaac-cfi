-- Contact form fallback storage for when RESEND_API_KEY is unset
-- Per D-15: ensures no inquiry is silently lost
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  subject TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: service role only (API route uses getSupabaseAdmin which bypasses RLS)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- No user-level access; only service role can insert/read
CREATE POLICY "Service role only"
  ON contact_submissions FOR ALL
  USING (false);

-- Index for admin review queries
CREATE INDEX idx_contact_submissions_submitted_at
  ON contact_submissions (submitted_at DESC);
