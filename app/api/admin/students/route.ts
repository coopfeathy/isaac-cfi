import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type StudentRow = {
  id: string
  user_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  stripe_customer_id: string | null
  preferred_currency: string | null
  training_item_ids: string[] | null
  certificate_type: string | null
  certificate_number: string | null
  medical_class: string | null
  medical_expiration: string | null
  flight_review_date: string | null
  flight_review_due: string | null
  ipc_date: string | null
  ipc_due: string | null
  rental_checkout_date: string | null
  rental_currency_due: string | null
  total_hours: number | null
  pic_hours: number | null
  dual_hours: number | null
  instrument_hours: number | null
  training_stage: string | null
  notes: string | null
  status: string
  created_at: string
  updated_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
}

type CourseRow = {
  id: string
  title: string
}

type UnitRow = {
  id: string
  course_id: string
}

type LessonRow = {
  id: string
  title: string
  unit_id: string
}

type EnrollmentRow = {
  id: string
  course_id: string
  student_id: string
  assigned_at: string
  started_at: string | null
  completed_at: string | null
}

type ProgressRow = {
  lesson_id: string
  student_id: string
  percent_watched: number
  updated_at: string
  last_watched_at: string | null
}

type SyllabusItemRow = {
  id: string
  course_id: string
}

type SyllabusProgressRow = {
  syllabus_item_id: string
  student_id: string
  status: 'not_started' | 'introduced' | 'practiced' | 'proficient' | 'needs_work'
  score: number | null
  updated_at: string
  last_evaluated_at: string | null
}

type LessonEvaluationRow = {
  id: string
  course_id: string
  lesson_id: string | null
  student_id: string
  performance_rating: number
  strengths: string | null
  improvements: string | null
  homework: string | null
  next_lesson_focus: string | null
  created_at: string
  email_sent_at: string | null
}

type LessonEvaluationPrivateNoteRow = {
  lesson_evaluation_id: string
  notes: string
  created_at: string
}

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user }
}

const toIsoOrNull = (value: string | null | undefined) => (value ? new Date(value).toISOString() : null)

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const supabaseAdmin = getSupabaseAdmin()

    const [
      studentsResult,
      coursesResult,
      unitsResult,
      lessonsResult,
      enrollmentsResult,
      progressResult,
      syllabusItemsResult,
      syllabusProgressResult,
      evaluationsResult,
      authUsersResult,
    ] = await Promise.all([
      supabaseAdmin.from('students').select('*').order('full_name', { ascending: true }),
      supabaseAdmin.from('courses').select('id, title').order('title', { ascending: true }),
      supabaseAdmin.from('units').select('id, course_id'),
      supabaseAdmin.from('lessons').select('id, title, unit_id'),
      supabaseAdmin.from('enrollments').select('id, course_id, student_id, assigned_at, started_at, completed_at'),
      supabaseAdmin.from('progress').select('lesson_id, student_id, percent_watched, updated_at, last_watched_at'),
      supabaseAdmin.from('syllabus_items').select('id, course_id'),
      supabaseAdmin.from('student_syllabus_progress').select('syllabus_item_id, student_id, status, score, updated_at, last_evaluated_at'),
      supabaseAdmin.from('lesson_evaluations').select('id, course_id, lesson_id, student_id, performance_rating, strengths, improvements, homework, next_lesson_focus, created_at, email_sent_at').order('created_at', { ascending: false }),
      supabaseAdmin.auth.admin.listUsers(),
    ])

    const privateNotesResult = await supabaseAdmin
      .from('lesson_evaluation_private_notes')
      .select('lesson_evaluation_id, notes, created_at')
      .order('created_at', { ascending: false })

    if (studentsResult.error) throw studentsResult.error
    if (coursesResult.error) throw coursesResult.error
    if (unitsResult.error) throw unitsResult.error
    if (lessonsResult.error) throw lessonsResult.error
    if (enrollmentsResult.error) throw enrollmentsResult.error
    if (progressResult.error) throw progressResult.error
    if (syllabusItemsResult.error) throw syllabusItemsResult.error
    if (syllabusProgressResult.error) throw syllabusProgressResult.error
    if (evaluationsResult.error) throw evaluationsResult.error
    if (authUsersResult.error) throw authUsersResult.error
    if (privateNotesResult.error && privateNotesResult.error.code !== '42P01') {
      throw privateNotesResult.error
    }

    const students = (studentsResult.data || []) as StudentRow[]
    const courses = (coursesResult.data || []) as CourseRow[]
    const units = (unitsResult.data || []) as UnitRow[]
    const lessons = (lessonsResult.data || []) as LessonRow[]
    const enrollments = (enrollmentsResult.data || []) as EnrollmentRow[]
    const progressRows = (progressResult.data || []) as ProgressRow[]
    const syllabusItems = (syllabusItemsResult.data || []) as SyllabusItemRow[]
    const syllabusProgressRows = (syllabusProgressResult.data || []) as SyllabusProgressRow[]
    const evaluationRows = (evaluationsResult.data || []) as LessonEvaluationRow[]
    const privateNoteRows = (privateNotesResult.data || []) as LessonEvaluationPrivateNoteRow[]
    const authUsers = authUsersResult.data.users || []

    const privateNotesByEvaluationId = new Map<string, string>()
    privateNoteRows.forEach((row) => {
      if (!privateNotesByEvaluationId.has(row.lesson_evaluation_id)) {
        privateNotesByEvaluationId.set(row.lesson_evaluation_id, row.notes)
      }
    })

    const studentUserIds = Array.from(new Set(students.map((student) => student.user_id).filter(Boolean))) as string[]
    const profilesResult = studentUserIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name, phone').in('id', studentUserIds)
      : { data: [], error: null }

    if (profilesResult.error) throw profilesResult.error

    const profiles = (profilesResult.data || []) as ProfileRow[]

    const courseById = new Map(courses.map((course) => [course.id, course]))
    const unitToCourseId = new Map(units.map((unit) => [unit.id, unit.course_id]))
    const lessonById = new Map(
      lessons.map((lesson) => [lesson.id, { ...lesson, course_id: unitToCourseId.get(lesson.unit_id) || null }])
    )
    const authUserById = new Map(
      authUsers.map((user) => [
        user.id,
        {
          email: user.email || null,
          full_name:
            (user.user_metadata?.full_name as string | undefined) ||
            [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ') ||
            null,
        },
      ])
    )
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]))

    const enrollmentsByStudentId = new Map<string, EnrollmentRow[]>()
    enrollments.forEach((row) => {
      const existing = enrollmentsByStudentId.get(row.student_id) || []
      existing.push(row)
      enrollmentsByStudentId.set(row.student_id, existing)
    })

    const progressByStudentId = new Map<string, ProgressRow[]>()
    progressRows.forEach((row) => {
      const existing = progressByStudentId.get(row.student_id) || []
      existing.push(row)
      progressByStudentId.set(row.student_id, existing)
    })

    const syllabusItemIdsByCourseId = new Map<string, string[]>()
    const syllabusCourseByItemId = new Map<string, string>()
    syllabusItems.forEach((item) => {
      syllabusCourseByItemId.set(item.id, item.course_id)
      const existing = syllabusItemIdsByCourseId.get(item.course_id) || []
      existing.push(item.id)
      syllabusItemIdsByCourseId.set(item.course_id, existing)
    })

    const syllabusProgressByStudentId = new Map<string, SyllabusProgressRow[]>()
    syllabusProgressRows.forEach((row) => {
      const existing = syllabusProgressByStudentId.get(row.student_id) || []
      existing.push(row)
      syllabusProgressByStudentId.set(row.student_id, existing)
    })

    const evaluationsByStudentId = new Map<string, LessonEvaluationRow[]>()
    evaluationRows.forEach((row) => {
      const existing = evaluationsByStudentId.get(row.student_id) || []
      existing.push(row)
      evaluationsByStudentId.set(row.student_id, existing)
    })

    const lessonIdsByCourseId = new Map<string, string[]>()
    lessons.forEach((lesson) => {
      const courseId = unitToCourseId.get(lesson.unit_id)
      if (!courseId) return
      const existing = lessonIdsByCourseId.get(courseId) || []
      existing.push(lesson.id)
      lessonIdsByCourseId.set(courseId, existing)
    })

    const responseStudents = students.map((student) => {
      const profile = student.user_id ? profileById.get(student.user_id) : null
      const authUser = student.user_id ? authUserById.get(student.user_id) : null
      const enrollmentRowsForStudent = student.user_id ? enrollmentsByStudentId.get(student.user_id) || [] : []
      const progressForStudent = student.user_id ? progressByStudentId.get(student.user_id) || [] : []
      const syllabusForStudent = student.user_id ? syllabusProgressByStudentId.get(student.user_id) || [] : []
      const evaluationsForStudent = student.user_id ? evaluationsByStudentId.get(student.user_id) || [] : []

      const coursesForStudent = enrollmentRowsForStudent.map((enrollment) => {
        const course = courseById.get(enrollment.course_id)
        const lessonIds = lessonIdsByCourseId.get(enrollment.course_id) || []
        const lessonIdSet = new Set(lessonIds)
        const lessonProgressRows = progressForStudent.filter((row) => lessonIdSet.has(row.lesson_id))
        const completedLessons = lessonProgressRows.filter((row) => row.percent_watched >= 95).length
        const totalLessonProgress = lessonProgressRows.reduce((sum, row) => sum + Math.min(100, Math.max(0, row.percent_watched || 0)), 0)
        const videoProgressPercent = lessonIds.length > 0 ? Math.round(totalLessonProgress / lessonIds.length) : 0

        const syllabusItemIds = syllabusItemIdsByCourseId.get(enrollment.course_id) || []
        const syllabusIdSet = new Set(syllabusItemIds)
        const syllabusRows = syllabusForStudent.filter((row) => syllabusIdSet.has(row.syllabus_item_id))
        const proficientItems = syllabusRows.filter((row) => row.status === 'proficient').length
        const scoredRows = syllabusRows.filter((row) => typeof row.score === 'number')
        const averageSyllabusScore = scoredRows.length > 0
          ? Number((scoredRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / scoredRows.length).toFixed(1))
          : null

        const evaluationRowsForCourse = evaluationsForStudent.filter((row) => row.course_id === enrollment.course_id)
        const averagePerformanceRating = evaluationRowsForCourse.length > 0
          ? Number((evaluationRowsForCourse.reduce((sum, row) => sum + row.performance_rating, 0) / evaluationRowsForCourse.length).toFixed(1))
          : null
        const latestEvaluation = evaluationRowsForCourse[0] || null

        const activityCandidates = [
          enrollment.completed_at,
          enrollment.started_at,
          enrollment.assigned_at,
          ...lessonProgressRows.flatMap((row) => [row.updated_at, row.last_watched_at]),
          ...syllabusRows.flatMap((row) => [row.updated_at, row.last_evaluated_at]),
          ...evaluationRowsForCourse.map((row) => row.created_at),
        ].filter(Boolean) as string[]

        return {
          id: enrollment.id,
          courseId: enrollment.course_id,
          courseTitle: course?.title || 'Untitled Course',
          assignedAt: enrollment.assigned_at,
          startedAt: enrollment.started_at,
          completedAt: enrollment.completed_at,
          totalLessons: lessonIds.length,
          completedLessons,
          videoProgressPercent,
          totalSyllabusItems: syllabusItemIds.length,
          proficientItems,
          syllabusCompletionPercent:
            syllabusItemIds.length > 0 ? Math.round((proficientItems / syllabusItemIds.length) * 100) : 0,
          averageSyllabusScore,
          evaluationCount: evaluationRowsForCourse.length,
          averagePerformanceRating,
          lastEvaluationAt: latestEvaluation?.created_at || null,
          lastActivityAt:
            activityCandidates.length > 0
              ? activityCandidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]
              : null,
        }
      })

      const totalLessons = coursesForStudent.reduce((sum, course) => sum + course.totalLessons, 0)
      const completedLessons = coursesForStudent.reduce((sum, course) => sum + course.completedLessons, 0)
      const totalSyllabusItems = coursesForStudent.reduce((sum, course) => sum + course.totalSyllabusItems, 0)
      const proficientItems = coursesForStudent.reduce((sum, course) => sum + course.proficientItems, 0)
      const videoProgressPercent = totalLessons > 0
        ? Math.round(coursesForStudent.reduce((sum, course) => sum + course.videoProgressPercent * course.totalLessons, 0) / totalLessons)
        : 0
      const performanceRows = evaluationsForStudent.map((row) => row.performance_rating)
      const averagePerformanceRating = performanceRows.length > 0
        ? Number((performanceRows.reduce((sum, value) => sum + value, 0) / performanceRows.length).toFixed(1))
        : null

      const recentEvaluations = evaluationsForStudent.slice(0, 5).map((row) => ({
        id: row.id,
        courseId: row.course_id,
        courseTitle: courseById.get(row.course_id)?.title || 'Untitled Course',
        lessonId: row.lesson_id,
        lessonTitle: row.lesson_id ? lessonById.get(row.lesson_id)?.title || 'Untitled Lesson' : null,
        performanceRating: row.performance_rating,
        strengths: row.strengths,
        improvements: row.improvements,
        homework: row.homework,
        nextLessonFocus: row.next_lesson_focus,
        instructorPrivateNotes: privateNotesByEvaluationId.get(row.id) || null,
        createdAt: row.created_at,
        emailSentAt: row.email_sent_at,
      }))

      const lastActivityCandidates = [
        student.updated_at,
        ...coursesForStudent.map((course) => course.lastActivityAt).filter(Boolean),
        ...recentEvaluations.map((evaluation) => evaluation.createdAt),
      ] as string[]

      return {
        id: student.id,
        userId: student.user_id,
        hasLinkedAccount: Boolean(student.user_id),
        fullName: student.full_name || profile?.full_name || authUser?.full_name || student.email || 'Student',
        email: student.email || authUser?.email || null,
        phone: student.phone || profile?.phone || null,
        stripeCustomerId: student.stripe_customer_id,
        preferredCurrency: (student.preferred_currency || 'usd').toLowerCase(),
        trainingItemIds: student.training_item_ids || [],
        status: student.status,
        trainingStage: student.training_stage,
        certificateType: student.certificate_type,
        certificateNumber: student.certificate_number,
        medicalClass: student.medical_class,
        medicalExpiration: toIsoOrNull(student.medical_expiration),
        flightReviewDate: toIsoOrNull(student.flight_review_date),
        flightReviewDue: toIsoOrNull(student.flight_review_due),
        ipcDate: toIsoOrNull(student.ipc_date),
        ipcDue: toIsoOrNull(student.ipc_due),
        rentalCheckoutDate: toIsoOrNull(student.rental_checkout_date),
        rentalCurrencyDue: toIsoOrNull(student.rental_currency_due),
        totalHours: Number(student.total_hours || 0),
        picHours: Number(student.pic_hours || 0),
        dualHours: Number(student.dual_hours || 0),
        instrumentHours: Number(student.instrument_hours || 0),
        notes: student.notes,
        createdAt: student.created_at,
        updatedAt: student.updated_at,
        courses: coursesForStudent,
        recentEvaluations,
        overall: {
          enrolledCourses: coursesForStudent.length,
          completedCourses: coursesForStudent.filter((course) => Boolean(course.completedAt)).length,
          totalLessons,
          completedLessons,
          totalSyllabusItems,
          proficientItems,
          videoProgressPercent,
          syllabusCompletionPercent: totalSyllabusItems > 0 ? Math.round((proficientItems / totalSyllabusItems) * 100) : 0,
          averagePerformanceRating,
          lastActivityAt:
            lastActivityCandidates.length > 0
              ? lastActivityCandidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]
              : null,
        },
      }
    })

    return NextResponse.json({ students: responseStudents })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
