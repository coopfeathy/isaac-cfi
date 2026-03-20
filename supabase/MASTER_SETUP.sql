-- MASTER SUPABASE SETUP
-- Run these scripts in this order inside Supabase SQL Editor.
-- Keep this as the single source of truth for schema setup.

-- 1) Core app + CRM baseline
--    File: supabase/complete-setup.sql

-- 2) Additional profile/account columns
--    File: supabase/add-profile-columns.sql
--    File: supabase/flight_circle_schema.sql

-- 3) Learning platform schema + progress
--    File: supabase/learn-platform-schema.sql
--    File: supabase/syllabus_progress_and_evaluations.sql

-- 4) Support + social media
--    File: supabase/support-tickets.sql
--    File: supabase/social_media_posts.sql

-- 5) Optional legacy migration (only if consolidating old prospect tables)
--    File: supabase/migrate-to-prospects-schema.sql

-- Notes
-- - This master file is intentionally concise to keep operations predictable.
-- - The detailed SQL files above are archived for history/reference.
-- - Use the archive folder only for troubleshooting old migrations.
