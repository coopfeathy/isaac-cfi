-- ============================================
-- COMPLETE SUPABASE SETUP FOR MERLIN FLIGHT TRAINING
-- ============================================
-- Run this entire file in your Supabase SQL Editor
-- Last updated: 2026-02-11
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Extends Supabase Auth users with additional profile info

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies (drop if exists happens automatically with CREATE OR REPLACE)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================
-- 2. SLOTS TABLE (for booking flight slots)
-- ============================================

CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('training', 'tour')),
  price INTEGER NOT NULL, -- in cents
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_booked BOOLEAN DEFAULT false,
  description TEXT
);

-- Enable Row Level Security
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Slots are viewable by everyone" ON slots;
DROP POLICY IF EXISTS "Only admins can insert slots" ON slots;
DROP POLICY IF EXISTS "Only admins can update slots" ON slots;
DROP POLICY IF EXISTS "Only admins can delete slots" ON slots;

-- Create policies
CREATE POLICY "Slots are viewable by everyone"
ON slots FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert slots"
ON slots FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Only admins can update slots"
ON slots FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Only admins can delete slots"
ON slots FOR DELETE
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================
-- 3. BOOKINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES slots(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'canceled', 'completed')),
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;

-- Create policies
CREATE POLICY "Users can view their own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
ON bookings FOR SELECT
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Users can insert their own bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any booking"
ON bookings FOR UPDATE
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- ============================================
-- 4. DISCOVERY FLIGHT SIGNUPS (Lead Capture)
-- ============================================

CREATE TABLE IF NOT EXISTS discovery_flight_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE discovery_flight_signups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view signups" ON discovery_flight_signups;
DROP POLICY IF EXISTS "Anyone can insert signups" ON discovery_flight_signups;

-- Create policies
CREATE POLICY "Authenticated users can view signups"
ON discovery_flight_signups FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can insert signups"
ON discovery_flight_signups FOR INSERT
WITH CHECK (true);

-- ============================================
-- 5. BLOG POSTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  published BOOLEAN DEFAULT false,
  author_id UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Admins can view all posts" ON posts;
DROP POLICY IF EXISTS "Admins can create posts" ON posts;
DROP POLICY IF EXISTS "Admins can update posts" ON posts;

-- Create policies
CREATE POLICY "Published posts are viewable by everyone"
ON posts FOR SELECT
USING (published = true);

CREATE POLICY "Admins can view all posts"
ON posts FOR SELECT
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can create posts"
ON posts FOR INSERT
WITH CHECK (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can update posts"
ON posts FOR UPDATE
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- ============================================
-- 6. CRM - PROSPECTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  meeting_location TEXT,
  meeting_date DATE,
  notes TEXT,
  interest_level TEXT CHECK (interest_level IN ('hot', 'warm', 'cold')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'converted', 'lost', 'inactive')),
  next_follow_up DATE,
  follow_up_frequency INTEGER DEFAULT 7,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all prospects" ON prospects;
DROP POLICY IF EXISTS "Admins can insert prospects" ON prospects;
DROP POLICY IF EXISTS "Admins can update prospects" ON prospects;
DROP POLICY IF EXISTS "Admins can delete prospects" ON prospects;

-- Create policies
CREATE POLICY "Admins can view all prospects"
ON prospects FOR SELECT
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can insert prospects"
ON prospects FOR INSERT
WITH CHECK (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can update prospects"
ON prospects FOR UPDATE
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can delete prospects"
ON prospects FOR DELETE
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- ============================================
-- 7. CRM - STUDENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  certificate_type TEXT,
  certificate_number TEXT,
  medical_class TEXT CHECK (medical_class IN ('first', 'second', 'third', 'basic_med')),
  medical_expiration DATE,
  flight_review_date DATE,
  flight_review_due DATE,
  ipc_date DATE,
  ipc_due DATE,
  rental_checkout_date DATE,
  rental_currency_due DATE,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  pic_hours DECIMAL(10, 2) DEFAULT 0,
  dual_hours DECIMAL(10, 2) DEFAULT 0,
  instrument_hours DECIMAL(10, 2) DEFAULT 0,
  training_stage TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'on_hold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view their own record" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Admins can insert students" ON students;
DROP POLICY IF EXISTS "Admins can update students" ON students;

-- Create policies
CREATE POLICY "Students can view their own record"
ON students FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all students"
ON students FOR SELECT
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can insert students"
ON students FOR INSERT
WITH CHECK (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can update students"
ON students FOR UPDATE
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- ============================================
-- 8. CRM - COMMUNICATIONS LOG
-- ============================================

CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'phone', 'in_person', 'note')),
  subject TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'sent' CHECK (status IN ('scheduled', 'sent', 'delivered', 'failed', 'opened'))
);

-- Enable Row Level Security
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all communications" ON communications;
DROP POLICY IF EXISTS "Admins can insert communications" ON communications;

-- Create policies
CREATE POLICY "Admins can view all communications"
ON communications FOR SELECT
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can insert communications"
ON communications FOR INSERT
WITH CHECK (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- ============================================
-- 9. CRM - REMINDERS/TASKS
-- ============================================

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  reminder_type TEXT CHECK (reminder_type IN ('follow_up', 'flight_review', 'ipc', 'medical', 'rental_currency', 'custom')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all reminders" ON reminders;
DROP POLICY IF EXISTS "Admins can insert reminders" ON reminders;
DROP POLICY IF EXISTS "Admins can update reminders" ON reminders;

-- Create policies
CREATE POLICY "Admins can view all reminders"
ON reminders FOR SELECT
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can insert reminders"
ON reminders FOR INSERT
WITH CHECK (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

CREATE POLICY "Admins can update reminders"
ON reminders FOR UPDATE
USING (
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- ============================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================

-- Slots indexes
CREATE INDEX IF NOT EXISTS idx_slots_start_time ON slots(start_time);
CREATE INDEX IF NOT EXISTS idx_slots_is_booked ON slots(is_booked);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);

-- Discovery signups indexes
CREATE INDEX IF NOT EXISTS idx_discovery_signups_email ON discovery_flight_signups(email);
CREATE INDEX IF NOT EXISTS idx_discovery_signups_created_at ON discovery_flight_signups(created_at DESC);

-- CRM indexes
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_next_follow_up ON prospects(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_communications_prospect_id ON communications(prospect_id);
CREATE INDEX IF NOT EXISTS idx_communications_student_id ON communications(student_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

-- ============================================
-- 11. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public.profiles (id, full_name, created_at)
VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NOW());
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prospects_updated_at ON prospects;
CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON prospects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Go to Authentication > Providers and enable Email
-- 2. Go to Authentication > URL Configuration:
--    - Site URL: http://localhost:3000
--    - Redirect URLs: http://localhost:3000/auth/callback
-- 3. Sign up at http://localhost:3000/login with Isaac.Imp.Prestwich@gmail.com
-- 4. Run this SQL to make yourself admin:
--    UPDATE profiles SET is_admin = true 
--    WHERE id = (SELECT id FROM auth.users WHERE email = 'Isaac.Imp.Prestwich@gmail.com');
-- ============================================
