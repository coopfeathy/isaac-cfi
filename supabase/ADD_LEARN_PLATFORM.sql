-- ============================================
-- ADD LEARN PLATFORM TO EXISTING DATABASE
-- ============================================
-- Run this SQL in your Supabase SQL Editor to add course/lesson tables
-- This assumes you already have the profiles table with is_admin column
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: CREATE ALL TABLES FIRST
-- ============================================

-- COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT false
);

-- UNITS TABLE (modules within a course)
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LESSONS TABLE
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VIDEOS TABLE
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, student_id)
);

-- PROGRESS TABLE
-- PROGRESS TABLE
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

-- ============================================
-- STEP 2: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: DROP ANY EXISTING POLICIES
-- ============================================
-- Courses
DROP POLICY IF EXISTS "Published courses are viewable by everyone" ON courses;
DROP POLICY IF EXISTS "Enrolled students can view their courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "Admins can create courses" ON courses;
DROP POLICY IF EXISTS "Course creator can update their course" ON courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON courses;

-- Units
DROP POLICY IF EXISTS "Units are viewable if course is viewable" ON units;
DROP POLICY IF EXISTS "Admins can manage units" ON units;
DROP POLICY IF EXISTS "Admins can update units" ON units;
DROP POLICY IF EXISTS "Admins can delete units" ON units;

-- Lessons
DROP POLICY IF EXISTS "Lessons are viewable if unit's course is viewable" ON lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON lessons;

-- Videos
DROP POLICY IF EXISTS "Videos are viewable if lesson's course is viewable" ON videos;
DROP POLICY IF EXISTS "Admins can manage videos" ON videos;
DROP POLICY IF EXISTS "Admins can update videos" ON videos;
DROP POLICY IF EXISTS "Admins can delete videos" ON videos;

-- Enrollments
DROP POLICY IF EXISTS "Students can view their own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can create enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can delete enrollments" ON enrollments;

-- Progress
DROP POLICY IF EXISTS "Students can view their own progress" ON progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON progress;
DROP POLICY IF EXISTS "Students can update their own progress" ON progress;
DROP POLICY IF EXISTS "Admins can update progress" ON progress;
DROP POLICY IF EXISTS "Students can insert their own progress" ON progress;

-- ============================================
-- STEP 4: CREATE ALL POLICIES (NOW ALL TABLES EXIST)
-- ============================================

-- ============================================
-- COURSES POLICIES
-- ============================================
CREATE POLICY "Published courses are viewable by everyone"
  ON courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "Enrolled students can view their courses"
  ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = courses.id
      AND enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all courses"
  ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create courses"
  ON courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Course creator can update their course"
  ON courses FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete courses"
  ON courses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- UNITS POLICIES
-- ============================================
CREATE POLICY "Units are viewable if course is viewable"
  ON units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = units.course_id
      AND (
        courses.is_published = true OR
        EXISTS (
          SELECT 1 FROM enrollments
          WHERE enrollments.course_id = courses.id
          AND enrollments.student_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
        )
      )
    )
  );

CREATE POLICY "Admins can manage units"
  ON units FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update units"
  ON units FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete units"
  ON units FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- LESSONS POLICIES
-- ============================================
CREATE POLICY "Lessons are viewable if unit's course is viewable"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM units
      JOIN courses ON courses.id = units.course_id
      WHERE units.id = lessons.unit_id
      AND (
        courses.is_published = true OR
        EXISTS (
          SELECT 1 FROM enrollments
          WHERE enrollments.course_id = courses.id
          AND enrollments.student_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
        )
      )
    )
  );

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update lessons"
  ON lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete lessons"
  ON lessons FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- VIDEOS POLICIES
-- ============================================
CREATE POLICY "Videos are viewable if lesson's course is viewable"
  ON videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN units ON units.id = lessons.unit_id
      JOIN courses ON courses.id = units.course_id
      WHERE lessons.id = videos.lesson_id
      AND (
        courses.is_published = true OR
        EXISTS (
          SELECT 1 FROM enrollments
          WHERE enrollments.course_id = courses.id
          AND enrollments.student_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
        )
      )
    )
  );

CREATE POLICY "Admins can manage videos"
  ON videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update videos"
  ON videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete videos"
  ON videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- ENROLLMENTS POLICIES
-- ============================================
CREATE POLICY "Students can view their own enrollments"
  ON enrollments FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create enrollments"
  ON enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete enrollments"
  ON enrollments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- PROGRESS POLICIES
-- ============================================
CREATE POLICY "Students can view their own progress"
  ON progress FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all progress"
  ON progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Students can update their own progress"
  ON progress FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can update progress"
  ON progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Students can insert their own progress"
  ON progress FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON courses(created_by);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_units_course_id ON units(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit_id ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_videos_lesson_id ON videos(lesson_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_student_id ON progress(student_id);

-- ============================================
-- CREATE SUPABASE STORAGE BUCKET FOR VIDEOS
-- ============================================
-- You need to do this in Supabase Dashboard -> Storage:
-- 1. Create a new bucket called "videos"
-- 2. Make it public or configure policies for authenticated users
-- 3. Set allowed file types to video formats (mp4, webm, etc.)

-- ============================================
-- VERIFY YOUR ADMIN STATUS
-- ============================================
-- Run this to check if your account is set as admin:
-- SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@gmail.com';
-- Then update your profile:
-- UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID_FROM_ABOVE';

-- ============================================
-- FINISHED!
-- ============================================
-- Your learn platform tables are now ready.
-- Go to https://merlinflighttraining.com/admin to manage courses!
