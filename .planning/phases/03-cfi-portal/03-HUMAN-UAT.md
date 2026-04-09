---
status: partial
phase: 03-cfi-portal
source: [03-VERIFICATION.md]
started: 2026-04-08T00:00:00Z
updated: 2026-04-08T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. CFI zone access
expected: A user with `is_instructor=true` can navigate to `/cfi` and reach the dashboard without being redirected
result: [pending]

### 2. Non-instructor redirect
expected: A student user (no is_instructor, no is_admin) hitting `/cfi` is redirected to `/dashboard`
result: [pending]

### 3. Admin superset (CFI-07)
expected: A user with `is_admin=true` (but not is_instructor) can access `/cfi` without redirect
result: [pending]

### 4. Student roster real data
expected: `/cfi/students` renders a table with real student records from the DB, including endorsement counts
result: [pending]

### 5. Availability → slot picker reflection
expected: Adding a new availability block in `/cfi/availability` causes that time slot to appear in the student-facing `/schedule` picker
result: [pending]

### 6. Flight hour logging
expected: Submitting the Log Hours form increments the student's `dual_hours` via the `increment_student_hours` RPC atomically
result: [pending]

### 7. Endorsement recording
expected: Submitting the Log Endorsement form inserts a row into `student_endorsements` and the endorsement badge/count updates in the UI
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
