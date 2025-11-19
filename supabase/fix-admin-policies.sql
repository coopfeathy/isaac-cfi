-- Fix Admin Access for Slots, Bookings, and Posts
-- Run this in Supabase SQL Editor

-- OPTION 1: Set your user as admin in the profiles table
-- Replace 'Isaac.Imp.Prestwich@gmail.com' with your actual email if different
UPDATE profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'Isaac.Imp.Prestwich@gmail.com'
);

-- Verify it worked (you should see your profile with is_admin = true)
SELECT id, full_name, email, is_admin 
FROM profiles 
JOIN auth.users ON profiles.id = auth.users.id
WHERE auth.users.email = 'Isaac.Imp.Prestwich@gmail.com';

-- If the profile doesn't exist yet, create it:
-- (Run this only if the UPDATE above affected 0 rows)
INSERT INTO profiles (id, is_admin)
SELECT id, true
FROM auth.users
WHERE email = 'Isaac.Imp.Prestwich@gmail.com'
ON CONFLICT (id) DO UPDATE
SET is_admin = true;
