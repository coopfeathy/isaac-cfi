-- ============================================
-- SYLLABUS PROGRESS + LESSON EVALUATIONS
-- ============================================
-- Run this after ADD_LEARN_PLATFORM.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Course-specific syllabus checklist items.
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

-- Student status for each syllabus item.
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

-- Per-lesson debrief summary authored by instructor.
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

CREATE INDEX IF NOT EXISTS idx_syllabus_items_course_id ON syllabus_items(course_id);
CREATE INDEX IF NOT EXISTS idx_student_syllabus_progress_student_id ON student_syllabus_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_syllabus_progress_item_id ON student_syllabus_progress(syllabus_item_id);
CREATE INDEX IF NOT EXISTS idx_lesson_evaluations_student_id ON lesson_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_evaluations_course_id ON lesson_evaluations(course_id);

ALTER TABLE syllabus_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_syllabus_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage syllabus items" ON syllabus_items;
DROP POLICY IF EXISTS "Enrolled students view syllabus items" ON syllabus_items;
DROP POLICY IF EXISTS "Admins manage student syllabus progress" ON student_syllabus_progress;
DROP POLICY IF EXISTS "Students view own syllabus progress" ON student_syllabus_progress;
DROP POLICY IF EXISTS "Admins manage lesson evaluations" ON lesson_evaluations;
DROP POLICY IF EXISTS "Students view own lesson evaluations" ON lesson_evaluations;

CREATE POLICY "Admins manage syllabus items"
  ON syllabus_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Enrolled students view syllabus items"
  ON syllabus_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = syllabus_items.course_id
      AND enrollments.student_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage student syllabus progress"
  ON student_syllabus_progress
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Students view own syllabus progress"
  ON student_syllabus_progress
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins manage lesson evaluations"
  ON lesson_evaluations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Students view own lesson evaluations"
  ON lesson_evaluations
  FOR SELECT
  USING (student_id = auth.uid());
