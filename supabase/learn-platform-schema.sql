-- Learn Platform Schema - Courses, Units, Lessons, Videos, Enrollments, Progress
-- Run this SQL in your Supabase SQL Editor

-- Courses table
create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_published boolean default false
);

alter table courses enable row level security;

create policy "Published courses are viewable by everyone"
  on courses for select
  using (is_published = true);

create policy "Enrolled students can view their courses"
  on courses for select
  using (
    exists (
      select 1 from enrollments
      where enrollments.course_id = courses.id
      and enrollments.student_id = auth.uid()
    )
  );

create policy "Admins can view all courses"
  on courses for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can create courses"
  on courses for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Course creator can update their course"
  on courses for update
  using (
    created_by = auth.uid() or
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Units table (modules within a course)
create table units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  order_index integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table units enable row level security;

create policy "Units are viewable if course is viewable"
  on units for select
  using (
    exists (
      select 1 from courses
      where courses.id = units.course_id
      and (
        courses.is_published = true or
        exists (
          select 1 from enrollments
          where enrollments.course_id = courses.id
          and enrollments.student_id = auth.uid()
        ) or
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
          and profiles.is_admin = true
        )
      )
    )
  );

create policy "Admins can manage units"
  on units for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can update units"
  on units for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Lessons table
create table lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  title text not null,
  order_index integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table lessons enable row level security;

create policy "Lessons are viewable if unit's course is viewable"
  on lessons for select
  using (
    exists (
      select 1 from units
      join courses on courses.id = units.course_id
      where units.id = lessons.unit_id
      and (
        courses.is_published = true or
        exists (
          select 1 from enrollments
          where enrollments.course_id = courses.id
          and enrollments.student_id = auth.uid()
        ) or
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
          and profiles.is_admin = true
        )
      )
    )
  );

create policy "Admins can manage lessons"
  on lessons for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can update lessons"
  on lessons for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Videos table (metadata + Supabase Storage bucket reference)
create table videos (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  title text not null,
  storage_path text not null, -- path in Supabase Storage (e.g., 'videos/course-1/lesson-1.mp4')
  duration_seconds integer, -- video duration
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table videos enable row level security;

create policy "Videos are viewable if lesson's course is viewable"
  on videos for select
  using (
    exists (
      select 1 from lessons
      join units on units.id = lessons.unit_id
      join courses on courses.id = units.course_id
      where lessons.id = videos.lesson_id
      and (
        courses.is_published = true or
        exists (
          select 1 from enrollments
          where enrollments.course_id = courses.id
          and enrollments.student_id = auth.uid()
        ) or
        exists (
          select 1 from profiles
          where profiles.id = auth.uid()
          and profiles.is_admin = true
        )
      )
    )
  );

create policy "Admins can manage videos"
  on videos for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can update videos"
  on videos for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Enrollments table (admin assigns students to courses)
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique(course_id, student_id)
);

alter table enrollments enable row level security;

create policy "Students can view their own enrollments"
  on enrollments for select
  using (auth.uid() = student_id);

create policy "Admins can view all enrollments"
  on enrollments for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can create enrollments"
  on enrollments for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can delete enrollments"
  on enrollments for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Progress table (track % watched per lesson per student)
create table progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  percent_watched integer default 0 check (percent_watched >= 0 and percent_watched <= 100),
  last_watched_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(lesson_id, student_id)
);

alter table progress enable row level security;

create policy "Students can view their own progress"
  on progress for select
  using (auth.uid() = student_id);

create policy "Admins can view all progress"
  on progress for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Students can update their own progress"
  on progress for update
  using (auth.uid() = student_id);

create policy "Admins can update progress"
  on progress for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Students can insert their own progress"
  on progress for insert
  with check (auth.uid() = student_id);

-- Indexes for better performance
create index idx_courses_created_by on courses(created_by);
create index idx_courses_is_published on courses(is_published);
create index idx_units_course_id on units(course_id);
create index idx_lessons_unit_id on lessons(unit_id);
create index idx_videos_lesson_id on videos(lesson_id);
create index idx_enrollments_course_id on enrollments(course_id);
create index idx_enrollments_student_id on enrollments(student_id);
create index idx_progress_lesson_id on progress(lesson_id);
create index idx_progress_student_id on progress(student_id);
