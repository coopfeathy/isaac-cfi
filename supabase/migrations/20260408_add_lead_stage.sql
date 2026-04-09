ALTER TABLE prospects ADD COLUMN IF NOT EXISTS lead_stage text DEFAULT 'new'
  CHECK (lead_stage IN ('new', 'contacted', 'booked', 'no-show', 'converted'));
UPDATE prospects SET lead_stage = 'new' WHERE lead_stage IS NULL;
