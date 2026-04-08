import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type StudentRow = {
  id: string
  user_id: string | null
  email: string | null
  full_name: string
  phone: string | null
  status: string | null
  created_at: string
}

const normalizeEmail = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const normalizeName = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''

const deriveNameFromEmail = (email: string | null | undefined) => {
  const normalized = normalizeEmail(email)
  if (!normalized) return 'Student'

  const localPart = normalized.split('@')[0] || ''
  const parts = localPart
    .replace(/[^a-z0-9._-]/gi, '')
    .split(/[._-]+/)
    .filter(Boolean)

  if (parts.length === 0) return 'Student'

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const isEmailLikeName = (name: string, email: string | null) => {
  const normalizedName = normalizeName(name).toLowerCase()
  if (!normalizedName) return true
  if (normalizedName === 'student') return true

  const normalizedEmail = normalizeEmail(email)
  if (normalizedEmail && normalizedName === normalizedEmail) return true

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedName)
}

const selectBestName = (args: {
  studentName: string
  profileName: string | null | undefined
  metadataName: string | null | undefined
  email: string | null
}) => {
  const candidates = [args.studentName, args.profileName || '', args.metadataName || '']
    .map((value) => normalizeName(value))
    .filter(Boolean)

  const nonEmailCandidate = candidates.find((candidate) => !isEmailLikeName(candidate, args.email))
  if (nonEmailCandidate) return nonEmailCandidate

  if (candidates.length > 0) return candidates[0]

  return deriveNameFromEmail(args.email)
}

const scoreStudent = (student: StudentRow) => {
  let score = 0
  if (student.user_id) score += 5
  if (!isEmailLikeName(student.full_name, student.email)) score += 3
  if (normalizeEmail(student.email)) score += 2
  if (student.phone?.trim()) score += 1
  if (student.status === 'active') score += 1
  return score
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const supabaseAdmin = getSupabaseAdmin()

    const [studentsResult, authUsersResult] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, user_id, email, full_name, phone, status, created_at')
        .order('created_at', { ascending: true }),
      supabaseAdmin.auth.admin.listUsers(),
    ])

    if (studentsResult.error) {
      return NextResponse.json({ error: studentsResult.error.message }, { status: 500 })
    }

    if (authUsersResult.error) {
      return NextResponse.json({ error: authUsersResult.error.message }, { status: 500 })
    }

    const students = (studentsResult.data || []) as StudentRow[]
    const authUsers = authUsersResult.data.users || []

    const usersById = new Map(authUsers.map((user) => [user.id, user]))

    const userIds = Array.from(new Set(students.map((row) => row.user_id).filter(Boolean))) as string[]
    const profilesResult = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds)
      : ({ data: [], error: null } as any)

    if (profilesResult.error) {
      return NextResponse.json({ error: profilesResult.error.message }, { status: 500 })
    }

    const profileNameById = new Map(
      ((profilesResult.data || []) as Array<{ id: string; full_name: string | null }>).map((row) => [row.id, row.full_name])
    )

    const grouped = new Map<string, StudentRow[]>()
    students.forEach((student) => {
      const normalizedEmail = normalizeEmail(student.email)
      const key = normalizedEmail
        ? `email:${normalizedEmail}`
        : student.user_id
        ? `auth:${student.user_id}`
        : `record:${student.id}`

      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(student)
    })

    const updates: Array<{ id: string; payload: Record<string, unknown> }> = []
    const idsToDelete: string[] = []
    let duplicateGroups = 0

    grouped.forEach((groupRows, key) => {
      const sorted = [...groupRows].sort((a, b) => {
        const scoreDiff = scoreStudent(b) - scoreStudent(a)
        if (scoreDiff !== 0) return scoreDiff
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      const survivor = sorted[0]
      const duplicates = sorted.slice(1)

      if ((key.startsWith('auth:') || key.startsWith('email:')) && duplicates.length > 0) {
        duplicateGroups += 1
        idsToDelete.push(...duplicates.map((row) => row.id))
      }

      const mergedUserId = sorted.find((row) => row.user_id)?.user_id || null
      const authUser = mergedUserId ? usersById.get(mergedUserId) : null
      const authEmail = authUser?.email || null
      const emailFromName =
        sorted
          .map((row) => normalizeName(row.full_name))
          .find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ||
        null
      const mergedEmail = authEmail || sorted.find((row) => normalizeEmail(row.email))?.email || emailFromName || null

      const metadataFullName =
        ((authUser?.user_metadata?.full_name as string | undefined) ||
          `${String(authUser?.user_metadata?.first_name || '').trim()} ${String(authUser?.user_metadata?.last_name || '').trim()}`.trim()) ||
        null

      const mergedName = selectBestName({
        studentName: sorted.find((row) => normalizeName(row.full_name))?.full_name || survivor.full_name,
        profileName: mergedUserId ? profileNameById.get(mergedUserId) : null,
        metadataName: metadataFullName,
        email: mergedEmail,
      })

      const mergedPhone = sorted.find((row) => row.phone && row.phone.trim().length > 0)?.phone || null
      const mergedStatus = sorted.find((row) => row.status === 'active')?.status || survivor.status || 'active'

      const nextPayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if ((survivor.user_id || null) !== mergedUserId) nextPayload.user_id = mergedUserId
      if ((survivor.email || null) !== (mergedEmail || null)) nextPayload.email = mergedEmail
      if (normalizeName(survivor.full_name) !== normalizeName(mergedName)) nextPayload.full_name = mergedName
      if ((survivor.phone || null) !== mergedPhone) nextPayload.phone = mergedPhone
      if ((survivor.status || null) !== mergedStatus) nextPayload.status = mergedStatus

      if (Object.keys(nextPayload).length > 1) {
        updates.push({ id: survivor.id, payload: nextPayload })
      }
    })

    let updated = 0
    let filledNames = 0
    let filledEmails = 0
    for (const change of updates) {
      if (Object.prototype.hasOwnProperty.call(change.payload, 'full_name')) filledNames += 1
      if (Object.prototype.hasOwnProperty.call(change.payload, 'email')) filledEmails += 1
       const { error } = await supabaseAdmin.from('students').update(change.payload).eq('id', change.id)
       if (!error) updated += 1
    }

    let deleted = 0
    if (idsToDelete.length > 0) {
      const { error } = await supabaseAdmin.from('students').delete().in('id', idsToDelete)
      if (!error) deleted = idsToDelete.length
    }

    const { data: finalStudents } = await supabaseAdmin
      .from('students')
      .select('email, full_name')

    const unresolved = ((finalStudents || []) as Array<{ email: string | null; full_name: string }>).filter((row) => {
      const hasEmail = normalizeEmail(row.email).length > 0
      const hasName = normalizeName(row.full_name).length > 0 && !isEmailLikeName(row.full_name, row.email)
      return !hasEmail || !hasName
    }).length

    return NextResponse.json({
      success: true,
      scanned: students.length,
      duplicateGroups,
      updated,
      deleted,
      filledNames,
      filledEmails,
      unresolved,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
