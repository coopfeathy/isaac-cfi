-- CONSOLIDATION MIGRATION SCRIPT
-- This script safely migrates prospect_information and discovery_flight_signups into the prospects table
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: AUDIT - See what data you have
-- ============================================================================

-- Prospects from onboarding funnel
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email
FROM prospect_information;

-- Discovery flight leads
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT email) as unique_emails
FROM discovery_flight_signups;

-- Current prospects table
SELECT COUNT(*) FROM prospects;

-- ============================================================================
-- STEP 2: CHECK FOR DUPLICATES
-- ============================================================================

-- Duplicates within prospect_information
SELECT email, COUNT(*) as count
FROM prospect_information
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Duplicates that exist in both prospect_information and discovery_flight_signups
SELECT pi.email, 'prospect_information' as source
FROM prospect_information pi
WHERE pi.email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM discovery_flight_signups dfs 
    WHERE dfs.email = pi.email
  )
LIMIT 20;

-- ============================================================================
-- STEP 3: CREATE BACKUPS (Choose one approach)
-- ============================================================================

-- Option A: Create backup tables in the same database
CREATE TABLE IF NOT EXISTS prospect_information_backup AS 
SELECT * FROM prospect_information;

CREATE TABLE IF NOT EXISTS discovery_flight_signups_backup AS 
SELECT * FROM discovery_flight_signups;

-- Verify backups created
SELECT COUNT(*) as prospect_info_backup FROM prospect_information_backup;
SELECT COUNT(*) as discovery_flight_backup FROM discovery_flight_signups_backup;

-- ============================================================================
-- STEP 4: MIGRATE DATA INTO PROSPECTS TABLE
-- ============================================================================

-- Step 4a: Migrate from prospect_information
-- This creates a full prospect record with onboarding funnel data
INSERT INTO prospects (
  full_name, 
  email, 
  phone, 
  notes,
  source,
  created_at,
  status,
  interest_level
)
SELECT 
  COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''),
    first_name,
    email
  ) as full_name,
  email,
  phone_number as phone,
  CONCAT(
    'Training Objective: ', COALESCE(training_objective, 'Not specified'), ' | ',
    'Start Timeframe: ', COALESCE(training_start_timeframe, 'Not specified'), ' | ',
    'Certificates: ', COALESCE(current_certificates, 'None'), ' | ',
    'Medical Concerns: ', COALESCE(medical_concerns, 'None'), ' | ',
    'Height: ', COALESCE(CAST(height_feet AS VARCHAR), '?'), '''', COALESCE(CAST(height_inches AS VARCHAR), '?'), '" | ',
    'Weight: ', COALESCE(CAST(weight_lbs AS VARCHAR), '?'), ' lbs | ',
    'Location: ', COALESCE(preferred_location, 'Not specified'), ' | ',
    'DOB: ', COALESCE(CAST(dob AS VARCHAR), 'Not provided'), ' | ',
    'Citizenship: ', COALESCE(citizenship, 'Not specified'), ' | ',
    'English First Language: ', COALESCE(CAST(english_proficient AS VARCHAR), 'Unknown'), ' | ',
    'Interested in Instructing: ', COALESCE(CAST(interested_in_instructing AS VARCHAR), 'Unknown'), ' | ',
    'For Someone Else: ', COALESCE(CAST(is_for_someone_else AS VARCHAR), 'Unknown'), ' | ',
    'Agreed to SMS: ', COALESCE(CAST(agree_to_sms AS VARCHAR), 'Unknown')
  ) as notes,
  'discovery_flight' as source,
  created_at,
  'active' as status,
  'warm' as interest_level
FROM prospect_information pi
WHERE pi.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM prospects p WHERE p.email = pi.email
  );

-- Step 4b: Migrate from discovery_flight_signups
-- These are simpler - just email + source tracking
INSERT INTO prospects (
  full_name,
  email,
  notes,
  source,
  created_at,
  status
)
SELECT 
  split_part(split_part(email, '@', 1), '+', 1) as full_name,
  email,
  'Signed up for discovery flight' as notes,
  'discovery_flight' as source,
  created_at,
  'active' as status
FROM discovery_flight_signups dfs
WHERE dfs.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM prospects p WHERE p.email = dfs.email
  );

-- ============================================================================
-- STEP 5: VERIFY MIGRATION
-- ============================================================================

-- Check final counts
SELECT 
  'prospects' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(DISTINCT source) as sources
FROM prospects
WHERE source IS NOT NULL;

-- See data by source
SELECT 
  source,
  COUNT(*) as count,
  COUNT(DISTINCT email) as unique_emails
FROM prospects
GROUP BY source
ORDER BY count DESC;

-- Check for any NULL emails in prospects (should be minimal)
SELECT COUNT(*) FROM prospects WHERE email IS NULL;

-- ============================================================================
-- STEP 6: OPTIONAL - Archive old tables
-- Only run AFTER you've verified the migration worked perfectly
-- ============================================================================

-- Rename old tables to archive (keeps them but makes clear they're not in use)
-- ALTER TABLE prospect_information RENAME TO prospect_information_archived;
-- ALTER TABLE discovery_flight_signups RENAME TO discovery_flight_signups_archived;

-- Or drop them completely (only if you're 100% sure you don't need them)
-- DROP TABLE prospect_information CASCADE;
-- DROP TABLE discovery_flight_signups CASCADE;

-- ============================================================================
-- STEP 7: VERIFY CODE COMPATIBILITY
-- ============================================================================

-- Run these queries to make sure the data structure matches what your code expects
SELECT 
  email, 
  full_name, 
  phone, 
  interest_level, 
  status,
  source,
  created_at
FROM prospects
LIMIT 5;

-- ============================================================================
-- NOTES FOR YOUR SETUP
-- ============================================================================

/*
After migration, your admin email code will automatically work because:
1. Updated handleLoadRecipients already queries 'prospects' table
2. All your prospect_information data is now in prospects with source="discovery_flight"
3. All discovery_flight_signups are now in prospects with source="discovery_flight"
4. Future signups should go directly to prospects table

Next steps after verification:
1. Test admin email sender - should load prospects correctly
2. Delete old tables when you're confident (optional)
3. Redirect forms to insert into prospects table instead of old tables
4. Update any other code that references prospect_information or discovery_flight_signups
*/
