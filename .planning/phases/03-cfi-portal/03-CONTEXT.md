# Phase 3: CFI Portal - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a `/cfi` zone where instructors can log in, view their own schedule and student roster, set their weekly availability, and log flight hours and endorsements for their students — without touching the admin interface.

This phase does NOT touch student self-service, billing, or the public booking UX beyond updating the availability engine to union multiple CFIs' templates. Phase 1's `requireCFI()` is the prerequisite; this phase is the first consumer.

</domain>

<decisions>
## Implementation Decisions

### Instructor-Student Assignment (schema)
- **D-01:** Add `instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` to the `students` table. This is the mechanism for "students assigned to a CFI" (CFI-04).
- **D-02:** Only admin can set/change `instructor_id` on a student record. CFI portal is read-only for the roster — no reassignment capability on the CFI side.
- **D-03:** Add an RLS policy so that a CFI can SELECT from `students` WHERE `instructor_id = auth.uid()`. Currently CFIs have no SELECT on `students` at all.

### CFI Schedule View
- **D-04:** The schedule view queries `bookings` WHERE the booking's `user_id` matches a student whose `instructor_id = current CFI's user_id`. Join: `bookings` → `students` via `user_id` → filter on `students.instructor_id`.
- **D-05:** Default time window: today through the next 7 days. Show bookings with status `pending`, `confirmed`, or `completed`.
- **D-06:** The CFI only sees bookings for their own students. Admin sees all (existing behavior unchanged).

### Availability Template Ownership
- **D-07:** Add `instructor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` to the `instructor_availability` table. Each row belongs to a specific CFI.
- **D-08:** Migrate existing rows (no instructor_id) to be owned by the admin/owner user — or handled via a backfill migration.
- **D-09:** CFI portal exposes a read/write availability editor scoped to the logged-in CFI's rows. API endpoints enforce `requireCFI()` + filter by the calling user's id.
- **D-10:** Date-specific overrides (`instructor_availability_overrides` equivalent) remain admin-managed in Phase 3. Weekly template only for CFIs.
- **D-11:** Update `lib/availability-engine.ts` to union availability across all active CFIs: a time slot is available if ANY active CFI's template covers it. This powers the student-facing slot picker.
- **D-12:** "Active CFI" for the union = profiles where `is_instructor = true` AND `is_active` (or `status = active` if such a flag exists; otherwise all `is_instructor = true` profiles).

### Flight Hour Logging
- **D-13:** When a CFI logs hours for a lesson: (1) insert a new row into `student_lesson_completions` with `instructor_id`, `student_id`, `completed_at`, `notes`; (2) increment `students.dual_hours` and `students.total_hours` by the logged duration.
- **D-14:** The logging form asks for: student (picker from their roster), hours flown (decimal), date, and free-text notes. All fields required except notes.

### Endorsement + Milestone Storage
- **D-15:** Create a new `student_endorsements` table: `id UUID PK`, `student_id UUID FK auth.users`, `instructor_id UUID FK auth.users`, `endorsement_type TEXT`, `endorsed_at TIMESTAMPTZ DEFAULT NOW()`, `notes TEXT`.
- **D-16:** `endorsement_type` is constrained to a predefined list: `solo`, `xc_solo`, `night_solo`, `checkride_prep`, `instrument_proficiency_check`, `flight_review`, `other`.
- **D-17:** CFI UI shows a dropdown of the predefined types plus a notes field. The `other` option allows free text in notes.
- **D-18:** RLS: CFI can INSERT into `student_endorsements` for students where `instructor_id = auth.uid()`. Students can SELECT their own endorsements. Admins have full access.

### Auth + Zone Setup
- **D-19:** `/cfi` zone uses `requireCFI()` from `lib/auth.ts` (Phase 1 deliverable). Layout guard is a server component that redirects non-CFI users to `/login` or `/dashboard`.
- **D-20:** `AuthContext` needs `is_instructor` exposed alongside `isAdmin` so client components can check CFI role.
- **D-21:** Admin users can also access `/cfi` (CFI-07) — `requireCFI()` already allows this per Phase 1 D-02.

### Claude's Discretion
- Exact tab/page structure within `/cfi` (schedule, roster, availability, flight log as separate route segments or tab state)
- Whether to create a `CFIPageShell` component or reuse `AdminPageShell` with a different nav set
- Navigation links to/from `/cfi` vs `/admin` for admin users who access both
- Precise column selection and ordering in the student roster table
- Empty-state design for each section (no students assigned, no upcoming bookings, etc.)
- Loading skeleton approach per page/tab

</decisions>

<specifics>
## Specific Ideas

- `requireCFI()` from Phase 1 is the literal gating mechanism. If Phase 1 isn't shipped, Phase 3 cannot be tested.
- The `instructor_id` column on `students` is also needed by Phase 4 and Phase 6 (billing, lead nurturing) — it's a load-bearing schema addition.
- The availability engine union change is the riskiest part of Phase 3 because it touches the live student-facing booking flow. Should be guarded by tests.
- FAA endorsement types should match 14 CFR 61 endorsement categories but don't need to be exhaustive in v1 — `other` + notes covers the gaps.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — CFI-01 through CFI-07 (full requirement text for this phase)

### Auth (Phase 1 prerequisite)
- `lib/auth.ts` — `requireCFI()` implementation (must exist before Phase 3 executes)

### Schema files being modified
- `supabase/SETUP.sql` — current definitions for `profiles` (is_instructor), `students`, `instructor_availability`, `student_lesson_completions`, `bookings` — read before writing migrations
- `lib/types/calendar.ts` — `InstructorAvailability` type (needs `instructor_id` field addition)

### Availability engine
- `lib/availability-engine.ts` — core scheduling computation; must be updated for multi-CFI union

### Existing admin availability API (pattern reference)
- `app/api/admin/availability/route.ts` — existing availability CRUD; new CFI-scoped endpoints follow same pattern but scoped to `instructor_id`

### Existing patterns to follow
- `app/components/AdminPageShell.tsx` — established operator-zone page shell
- `app/contexts/AuthContext.tsx` — needs `is_instructor` exposed; existing `isAdmin` pattern to follow
- `app/api/admin/availability/__tests__/` — test patterns for availability API

</canonical_refs>

<deferred>
## Deferred Ideas

- Date-specific availability overrides per CFI (Phase 3 covers weekly templates only)
- CFI messaging students directly (CFI-V2-01)
- CFI viewing full syllabus progress and marking curriculum items complete (CFI-V2-02)
- Multi-CFI slot conflict detection (when two CFIs' templates overlap and a booking is made, which CFI is assigned) — Phase 4 or later
- Availability engine: intersection/per-CFI filter mode (deferred; union serves Phase 3 needs)

</deferred>

---

*Phase: 03-cfi-portal*
*Context gathered: 2026-04-08*
