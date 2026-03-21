-- ============================================================
-- MERLIN FLIGHT TRAINING — COMPLETE DATABASE SETUP
-- ============================================================
-- Run this entire file in your Supabase SQL Editor.
-- This is the single source of truth for database schema.
-- All DROP POLICY IF EXISTS guards make it safe to re-run.
-- Last updated: 2026-03-21
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. PROFILES
-- Extends Supabase Auth users with additional info
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  date_of_birth DATE,
  gender TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  balance_cents INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  is_instructor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 2. SLOTS (flight slot availability)
-- ============================================================
CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('training', 'tour')),
  price INTEGER NOT NULL, -- in cents
  description TEXT,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Slots are viewable by everyone" ON slots;
DROP POLICY IF EXISTS "Only admins can insert slots" ON slots;
DROP POLICY IF EXISTS "Only admins can update slots" ON slots;
DROP POLICY IF EXISTS "Only admins can delete slots" ON slots;

CREATE POLICY "Slots are viewable by everyone"
  ON slots FOR SELECT USING (true);

CREATE POLICY "Only admins can insert slots"
  ON slots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Only admins can update slots"
  ON slots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Only admins can delete slots"
  ON slots FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 3. BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES slots(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'canceled', 'completed')),
  stripe_session_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
  ON bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Users can insert their own bookings"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any booking"
  ON bookings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 4. DISCOVERY FLIGHT SIGNUPS (public lead capture)
-- ============================================================
CREATE TABLE IF NOT EXISTS discovery_flight_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE discovery_flight_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view signups" ON discovery_flight_signups;
DROP POLICY IF EXISTS "Anyone can insert signups" ON discovery_flight_signups;

CREATE POLICY "Authenticated users can view signups"
  ON discovery_flight_signups FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can insert signups"
  ON discovery_flight_signups FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_discovery_signups_email ON discovery_flight_signups(email);
CREATE INDEX IF NOT EXISTS idx_discovery_signups_created_at ON discovery_flight_signups(created_at DESC);

-- ============================================================
-- 5. POSTS (blog)
-- ============================================================
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

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Admins can view all posts" ON posts;
DROP POLICY IF EXISTS "Admins can create posts" ON posts;
DROP POLICY IF EXISTS "Admins can update posts" ON posts;

CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT USING (published = true);

CREATE POLICY "Admins can view all posts"
  ON posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can create posts"
  ON posts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can update posts"
  ON posts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 6. CRM — PROSPECTS
-- ============================================================
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
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all prospects" ON prospects;
DROP POLICY IF EXISTS "Admins can insert prospects" ON prospects;
DROP POLICY IF EXISTS "Admins can update prospects" ON prospects;
DROP POLICY IF EXISTS "Admins can delete prospects" ON prospects;
DROP POLICY IF EXISTS "Anyone can insert prospects" ON prospects;

CREATE POLICY "Admins can view all prospects"
  ON prospects FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Anyone can insert prospects"
  ON prospects FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update prospects"
  ON prospects FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete prospects"
  ON prospects FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 7. CRM — STUDENTS
-- ============================================================
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

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own record" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Admins can insert students" ON students;
DROP POLICY IF EXISTS "Admins can update students" ON students;

CREATE POLICY "Students can view their own record"
  ON students FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can insert students"
  ON students FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can update students"
  ON students FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 8. AIRCRAFT
-- ============================================================
CREATE TABLE IF NOT EXISTS aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  year INTEGER,
  equipment TEXT,
  rate_per_hour_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Aircraft" ON aircraft;
DROP POLICY IF EXISTS "Admin Write Aircraft" ON aircraft;

CREATE POLICY "Public Read Aircraft"
  ON aircraft FOR SELECT USING (true);

CREATE POLICY "Admin Write Aircraft"
  ON aircraft FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 9. GROUPS + GROUP MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. INSTRUCTOR DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS instructor_details (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  rate_per_hour_cents INTEGER DEFAULT 0,
  license_number TEXT,
  approval_status TEXT DEFAULT 'pending',
  bio TEXT
);

ALTER TABLE instructor_details ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. ITEMS (billing line items)
-- ============================================================
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  rate_cents INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read Items" ON items;
DROP POLICY IF EXISTS "Admin Write Items" ON items;

CREATE POLICY "Read Items"
  ON items FOR SELECT USING (true);

CREATE POLICY "Admin Write Items"
  ON items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 12. TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  related_schedule_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User Read Own Transactions" ON transactions;
DROP POLICY IF EXISTS "Admin Read All Transactions" ON transactions;
DROP POLICY IF EXISTS "Admin Write Transactions" ON transactions;

CREATE POLICY "User Read Own Transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin Read All Transactions"
  ON transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admin Write Transactions"
  ON transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 13. SCHEDULES (core scheduling)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  aircraft_id UUID REFERENCES aircraft(id) ON DELETE SET NULL,
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  title TEXT,
  notes TEXT,
  status TEXT DEFAULT 'scheduled',
  check_out_time TIMESTAMPTZ,
  check_in_time TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (end_time > start_time)
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read All Schedules" ON schedules;
DROP POLICY IF EXISTS "User Create Schedules" ON schedules;
DROP POLICY IF EXISTS "User Update Own Schedules" ON schedules;

CREATE POLICY "Read All Schedules"
  ON schedules FOR SELECT USING (true);

CREATE POLICY "User Create Schedules"
  ON schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "User Update Own Schedules"
  ON schedules FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================================
-- 14. COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published courses are viewable by everyone" ON courses;
DROP POLICY IF EXISTS "Enrolled students can view their courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "Admins can create courses" ON courses;
DROP POLICY IF EXISTS "Course creator can update their course" ON courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON courses;

CREATE POLICY "Published courses are viewable by everyone"
  ON courses FOR SELECT USING (is_published = true);

CREATE POLICY "Enrolled students can view their courses"
  ON courses FOR SELECT
  USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = courses.id AND enrollments.student_id = auth.uid()));

CREATE POLICY "Admins can view all courses"
  ON courses FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can create courses"
  ON courses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Course creator can update their course"
  ON courses FOR UPDATE
  USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete courses"
  ON courses FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 15. UNITS (modules within a course)
-- ============================================================
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Units are viewable if course is viewable" ON units;
DROP POLICY IF EXISTS "Admins can manage units" ON units;
DROP POLICY IF EXISTS "Admins can update units" ON units;
DROP POLICY IF EXISTS "Admins can delete units" ON units;

CREATE POLICY "Units are viewable if course is viewable"
  ON units FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = units.course_id AND courses.is_published = true)
    OR EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = units.course_id AND enrollments.student_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can manage units"
  ON units FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can update units"
  ON units FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete units"
  ON units FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 16. LESSONS
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lessons are viewable if unit's course is viewable" ON lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON lessons;

CREATE POLICY "Lessons are viewable if unit's course is viewable"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN courses ON courses.id = units.course_id
      WHERE units.id = lessons.unit_id
      AND (
        courses.is_published = true
        OR EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = courses.id AND enrollments.student_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
      )
    )
  );

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can update lessons"
  ON lessons FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete lessons"
  ON lessons FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 17. VIDEOS
-- ============================================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Videos are viewable if lesson's course is viewable" ON videos;
DROP POLICY IF EXISTS "Admins can manage videos" ON videos;
DROP POLICY IF EXISTS "Admins can update videos" ON videos;
DROP POLICY IF EXISTS "Admins can delete videos" ON videos;

CREATE POLICY "Videos are viewable if lesson's course is viewable"
  ON videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN units ON units.id = lessons.unit_id
      JOIN courses ON courses.id = units.course_id
      WHERE lessons.id = videos.lesson_id
      AND (
        courses.is_published = true
        OR EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = courses.id AND enrollments.student_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
      )
    )
  );

CREATE POLICY "Admins can manage videos"
  ON videos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can update videos"
  ON videos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete videos"
  ON videos FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 18. ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, student_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can create enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON enrollments;

CREATE POLICY "Students can view their own enrollments"
  ON enrollments FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can create enrollments"
  ON enrollments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete enrollments"
  ON enrollments FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 19. PROGRESS (lesson video watch progress)
-- ============================================================
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  percent_watched INTEGER DEFAULT 0 CHECK (percent_watched >= 0 AND percent_watched <= 100),
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own progress" ON progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON progress;
DROP POLICY IF EXISTS "Students can update their own progress" ON progress;
DROP POLICY IF EXISTS "Admins can update progress" ON progress;
DROP POLICY IF EXISTS "Students can insert their own progress" ON progress;

CREATE POLICY "Students can view their own progress"
  ON progress FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all progress"
  ON progress FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Students can update their own progress"
  ON progress FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Admins can update progress"
  ON progress FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Students can insert their own progress"
  ON progress FOR INSERT WITH CHECK (auth.uid() = student_id);

-- ============================================================
-- 20. SYLLABUS ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS syllabus_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  stage TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE syllabus_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage syllabus items" ON syllabus_items;
DROP POLICY IF EXISTS "Enrolled students view syllabus items" ON syllabus_items;

CREATE POLICY "Admins manage syllabus items"
  ON syllabus_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Enrolled students view syllabus items"
  ON syllabus_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = syllabus_items.course_id AND enrollments.student_id = auth.uid()));

-- ============================================================
-- 21. STUDENT SYLLABUS PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS student_syllabus_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_item_id UUID NOT NULL REFERENCES syllabus_items(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'introduced', 'practiced', 'proficient', 'needs_work')),
  score INTEGER CHECK (score >= 1 AND score <= 5),
  instructor_notes TEXT,
  last_evaluated_at TIMESTAMPTZ,
  evaluated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(syllabus_item_id, student_id)
);

ALTER TABLE student_syllabus_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage student syllabus progress" ON student_syllabus_progress;
DROP POLICY IF EXISTS "Students view own syllabus progress" ON student_syllabus_progress;

CREATE POLICY "Admins manage student syllabus progress"
  ON student_syllabus_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Students view own syllabus progress"
  ON student_syllabus_progress FOR SELECT USING (student_id = auth.uid());

-- ============================================================
-- 22. LESSON EVALUATIONS (instructor debrief per lesson)
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id),
  performance_rating INTEGER NOT NULL CHECK (performance_rating >= 1 AND performance_rating <= 5),
  strengths TEXT,
  improvements TEXT,
  homework TEXT,
  next_lesson_focus TEXT,
  email_sent_to TEXT,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lesson_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage lesson evaluations" ON lesson_evaluations;
DROP POLICY IF EXISTS "Students view own lesson evaluations" ON lesson_evaluations;

CREATE POLICY "Admins manage lesson evaluations"
  ON lesson_evaluations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Students view own lesson evaluations"
  ON lesson_evaluations FOR SELECT USING (student_id = auth.uid());

-- ============================================================
-- 23. SOCIAL MEDIA POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'facebook')),
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail TEXT,
  date TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'image', 'carousel')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view social media posts" ON social_media_posts;
DROP POLICY IF EXISTS "Admins can insert social media posts" ON social_media_posts;
DROP POLICY IF EXISTS "Admins can update social media posts" ON social_media_posts;
DROP POLICY IF EXISTS "Admins can delete social media posts" ON social_media_posts;
DROP POLICY IF EXISTS "Public can read social media posts" ON social_media_posts;

CREATE POLICY "Admins can view social media posts"
  ON social_media_posts FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can insert social media posts"
  ON social_media_posts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can update social media posts"
  ON social_media_posts FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins can delete social media posts"
  ON social_media_posts FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Public can read social media posts"
  ON social_media_posts FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS social_media_posts_date_idx ON social_media_posts(date DESC);

-- ============================================================
-- 24. PROSPECT INFORMATION (discovery flight onboarding funnel)
-- ============================================================
CREATE TABLE IF NOT EXISTS prospect_information (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  current_step INTEGER DEFAULT 0,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  dob DATE,
  citizenship TEXT,
  training_objective TEXT,
  training_start_timeframe TEXT,
  is_for_someone_else BOOLEAN DEFAULT false,
  agree_to_sms BOOLEAN DEFAULT false,
  english_proficient TEXT,
  interested_in_instructing TEXT,
  medical_concerns TEXT,
  current_certificates TEXT,
  height_feet INTEGER,
  height_inches INTEGER,
  weight_lbs INTEGER,
  preferred_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prospect_information ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to prospect_information" ON prospect_information;
DROP POLICY IF EXISTS "Allow public update to prospect_information" ON prospect_information;
DROP POLICY IF EXISTS "Allow public select from prospect_information" ON prospect_information;

CREATE POLICY "Allow public insert to prospect_information"
  ON prospect_information FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to prospect_information"
  ON prospect_information FOR UPDATE USING (true);

CREATE POLICY "Allow public select from prospect_information"
  ON prospect_information FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_prospect_information_email ON prospect_information(email);

-- ============================================================
-- 25. STUDENT ONBOARDING WORKFLOW
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  legal_first_name TEXT,
  legal_last_name TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  certificate_goal TEXT,
  status TEXT NOT NULL DEFAULT 'account_created' CHECK (status IN ('account_created', 'profile_completed', 'id_uploaded', 'docs_signed', 'approved')),
  id_document_uploaded_at TIMESTAMPTZ,
  docs_signed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('government_id_front', 'government_id_back', 'waiver', 'training_agreement', 'policy_acknowledgement', 'other')),
  file_bucket TEXT NOT NULL DEFAULT 'onboarding-private',
  file_path TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (upload_status IN ('uploaded', 'signed', 'rejected')),
  provider_envelope_id TEXT,
  provider_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('student', 'admin', 'system')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_status TEXT NOT NULL CHECK (review_status IN ('approved', 'rejected', 'needs_changes')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding profile" ON onboarding_profiles;
DROP POLICY IF EXISTS "Users can insert own onboarding profile" ON onboarding_profiles;
DROP POLICY IF EXISTS "Users can update own onboarding profile" ON onboarding_profiles;
DROP POLICY IF EXISTS "Admins can manage onboarding profiles" ON onboarding_profiles;

CREATE POLICY "Users can view own onboarding profile"
  ON onboarding_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding profile"
  ON onboarding_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding profile"
  ON onboarding_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage onboarding profiles"
  ON onboarding_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Users can view own onboarding documents" ON onboarding_documents;
DROP POLICY IF EXISTS "Users can insert own onboarding documents" ON onboarding_documents;
DROP POLICY IF EXISTS "Admins can manage onboarding documents" ON onboarding_documents;

CREATE POLICY "Users can view own onboarding documents"
  ON onboarding_documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding documents"
  ON onboarding_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage onboarding documents"
  ON onboarding_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Users can view own onboarding events" ON onboarding_events;
DROP POLICY IF EXISTS "Users can insert own onboarding events" ON onboarding_events;
DROP POLICY IF EXISTS "Admins can manage onboarding events" ON onboarding_events;

CREATE POLICY "Users can view own onboarding events"
  ON onboarding_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding events"
  ON onboarding_events FOR INSERT
  WITH CHECK (user_id = auth.uid() AND actor_user_id = auth.uid() AND actor_role = 'student');

CREATE POLICY "Admins can manage onboarding events"
  ON onboarding_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "Users can view own onboarding reviews" ON onboarding_reviews;
DROP POLICY IF EXISTS "Admins can manage onboarding reviews" ON onboarding_reviews;

CREATE POLICY "Users can view own onboarding reviews"
  ON onboarding_reviews FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage onboarding reviews"
  ON onboarding_reviews FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-private', 'onboarding-private', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Users can read own onboarding files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own onboarding files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own onboarding files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage onboarding files" ON storage.objects;

CREATE POLICY "Users can read own onboarding files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'onboarding-private'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can upload own onboarding files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'onboarding-private'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Users can delete own onboarding files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'onboarding-private'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "Admins can manage onboarding files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'onboarding-private'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  )
  WITH CHECK (
    bucket_id = 'onboarding-private'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_user_id ON onboarding_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_status ON onboarding_profiles(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_user_id ON onboarding_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_type ON onboarding_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_user_id ON onboarding_events(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_reviews_user_id ON onboarding_reviews(user_id);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_units_course_id ON units(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit_id ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_videos_lesson_id ON videos(lesson_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_student_id ON progress(student_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_items_course_id ON syllabus_items(course_id);
CREATE INDEX IF NOT EXISTS idx_student_syllabus_progress_student_id ON student_syllabus_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_syllabus_progress_item_id ON student_syllabus_progress(syllabus_item_id);
CREATE INDEX IF NOT EXISTS idx_lesson_evaluations_student_id ON lesson_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_evaluations_course_id ON lesson_evaluations(course_id);

-- ============================================================
-- DONE
-- All tables, RLS policies, and indexes are created.
-- ============================================================
