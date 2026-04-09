ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS sequence_step int NOT NULL DEFAULT 0;
COMMENT ON COLUMN prospects.sequence_step IS '0=no emails, 1=day-0 sent, 2=day-3 sent, 3=day-7 sent';
