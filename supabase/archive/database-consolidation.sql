-- DATABASE CONSOLIDATION GUIDE
-- This file helps you understand and consolidate your prospect/student data
-- Run sections selectively based on your needs

-- ============================================================================
-- AUDIT: Check what data you currently have in each table
-- ============================================================================

-- See all prospects from your onboarding funnel
SELECT COUNT(*), COUNT(DISTINCT email) as unique_emails 
FROM prospect_information 
WHERE email IS NOT NULL;

-- See all discovery flight leads
SELECT COUNT(*), COUNT(DISTINCT email) as unique_emails 
FROM discovery_flight_signups;

-- See if you have any students in the CRM table
SELECT COUNT(*), COUNT(DISTINCT email) as unique_emails 
FROM students 
WHERE email IS NOT NULL;

-- See if you have any prospects in the CRM table (probably empty)
SELECT COUNT(*), COUNT(DISTINCT email) as unique_emails 
FROM prospects 
WHERE email IS NOT NULL;

-- ============================================================================
-- OPTION 1: MIGRATE prospect_information → prospects CRM table
-- Use this if you want to move to the formal CRM structure
-- ============================================================================

-- Step 1: Backup prospect_information (optional but recommended)
-- Just run a SELECT to verify what you're about to migrate:
SELECT id, email, first_name, last_name, phone_number, created_at, notes 
FROM prospect_information 
LIMIT 10;

-- Step 2: Migrate data from prospect_information → prospects
-- First, check for duplicate emails
SELECT email, COUNT(*) FROM prospect_information 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Step 3: Insert non-duplicates into prospects table
-- (Only run if you confirmed duplicates are acceptable)
-- This will skip emails that already exist in prospects
INSERT INTO prospects (full_name, email, phone, notes, created_at, status)
SELECT 
  COALESCE(first_name || ' ' || last_name, email) as full_name,
  email,
  phone_number,
  training_objective,
  created_at,
  'active' as status
FROM prospect_information pi
WHERE email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM prospects p WHERE p.email = pi.email
  )
ON CONFLICT (email) DO NOTHING;

-- Verify the migration
SELECT COUNT(*) FROM prospects WHERE email IS NOT NULL;

-- ============================================================================
-- OPTION 2: CONSOLIDATE discovery_flight_signups into prospects
-- Use this to move discovery flight leads into the formal CRM
-- ============================================================================

-- Check for overlap between discovery_flight_signups and prospects
SELECT dfs.email 
FROM discovery_flight_signups dfs
WHERE dfs.email IS NOT NULL
  AND EXISTS (SELECT 1 FROM prospects p WHERE p.email = dfs.email);

-- Migrate leads to prospects
INSERT INTO prospects (full_name, email, notes, source, created_at, status)
SELECT 
  SUBSTRING_INDEX(SUBSTRING_INDEX(email, '@', 1), '+', 1) as full_name, -- Extract part before @ as fallback
  email,
  'From discovery flight signup' as notes,
  'discovery_flight' as source,
  created_at,
  'active' as status
FROM discovery_flight_signups dfs
WHERE email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM prospects p WHERE p.email = dfs.email
  )
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- OPTION 3: Clean up redundant data
-- Run ONLY after you've verified migrations are complete
-- ============================================================================

-- Step 1: Archive before deleting (create backup table)
CREATE TABLE prospect_information_archive AS 
SELECT * FROM prospect_information;

-- Step 2: Delete redundant prospect_information records
-- (Only if you've migrated everything to prospects table)
-- DELETE FROM prospect_information WHERE email IN (
--   SELECT email FROM prospects WHERE email IS NOT NULL
-- );

-- Step 3: Delete empty discovery_flight_signups records
-- (Only if you've migrated everything)
-- DELETE FROM discovery_flight_signups WHERE email IN (
--   SELECT email FROM prospects WHERE source = 'discovery_flight'
-- );

-- ============================================================================
-- CLEANUP: Track data sources in prospects table
-- Run this to add source tracking if you migrate data
-- ============================================================================

-- Ensure prospects table has a source column
ALTER TABLE prospects ADD COLUMN source TEXT;
UPDATE prospects SET source = 'funnel' WHERE source IS NULL;

-- ============================================================================
-- VERIFY: Final data summary after consolidation
-- ============================================================================

SELECT 
  'prospects' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_count
FROM prospects
UNION ALL
SELECT 
  'students' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
  0
FROM students
UNION ALL
SELECT 
  'prospect_information' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT email) as unique_emails,
  0 as active_count,
  0
FROM prospect_information;

-- ============================================================================
-- RECOMMENDATIONS FOR YOUR SETUP
-- ============================================================================

/*
1. SHORT TERM (keeps things simple):
   - Keep using prospect_information for onboarding funnel data
   - Keep using discovery_flight_signups for simple lead captures
   - Update admin email loading code to query these tables (✅ Already done)
   - Only populate prospects/students tables when you have formal CRM usage

2. MEDIUM TERM (better organization):
   - Migrate prospect_information → prospects manually
   - Migrate discovery_flight_signups → prospects with source tracking
   - Delete empty prospect_information table
   - This gives you one unified prospects list

3. LONG TERM (scale):
   - Use prospects table for all lead/prospect management
   - Use students table for enrolled trainees with certifications
   - Use prospect_information ONLY for the form data during onboarding
     (don't duplicate - just reference the prospect_id)
   - Archive old data regularly

4. DATA QUALITY:
   - Add email validation on form submission
   - Deduplicate emails before migrations (check duplicates query above)
   - Track source for every prospect (funnel, discovery flight, referral, etc.)
   - Implement data cleanup jobs quarterly
*/
