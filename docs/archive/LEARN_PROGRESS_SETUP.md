# Learn Progress + Lesson Debrief Setup

This project now includes a syllabus progress system with instructor lesson evaluations and optional student email debriefs.

## 1) Apply database migration

Run this file in Supabase SQL Editor:

- `supabase/syllabus_progress_and_evaluations.sql`

This creates:

- `syllabus_items`
- `student_syllabus_progress`
- `lesson_evaluations`

## 2) Confirm environment variables

The email workflow uses Resend and server-side Supabase admin access.

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

## 3) Admin workflow

1. Go to `/admin/progress`
2. Select a course
3. Add syllabus checklist items (customized for Isaac's training style)
4. Select an enrolled student
5. Fill in lesson evaluation + update syllabus item statuses
6. Save and optionally email the debrief to the student

## 4) Student workflow

1. Student signs in normally
2. Student opens `/progress`
3. Student sees:
   - Course-level completion
   - Item-by-item syllabus status
   - Recent lesson debrief notes

## 5) Notes

- The file `private Annotated.pdf` is not parsed automatically. Use it as a reference and enter custom syllabus items through `/admin/progress`.
- If you want auto-import from PDF later, we can add a one-time parser pipeline and mapping UI.
