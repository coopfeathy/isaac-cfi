"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AdminPageShell from '@/app/components/AdminPageShell'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type StudentCourseSummary = {
  id: string
  courseId: string
  courseTitle: string
  assignedAt: string
  startedAt: string | null
  completedAt: string | null
  totalLessons: number
  completedLessons: number
  videoProgressPercent: number
  totalSyllabusItems: number
  proficientItems: number
  syllabusCompletionPercent: number
  averageSyllabusScore: number | null
  evaluationCount: number
  averagePerformanceRating: number | null
  lastEvaluationAt: string | null
  lastActivityAt: string | null
}

type StudentEvaluation = {
  homeworkQueue: {
    status: 'pending' | 'held' | 'sent' | 'failed'
    send_after_at: string | null
    sent_at: string | null
    last_error: string | null
  } | null
  id: string
  courseId: string
  courseTitle: string
  lessonId: string | null
  lessonTitle: string | null
  performanceRating: number
  strengths: string | null
  improvements: string | null
  homework: string | null
  nextLessonFocus: string | null
  instructorPrivateNotes: string | null
  createdAt: string
  emailSentAt: string | null
}

type StudentRecord = {
  id: string
  userId: string | null
  hasLinkedAccount: boolean
  fullName: string
  email: string | null
  phone: string | null
  stripeCustomerId: string | null
  preferredCurrency: string
  trainingItemIds: string[]
  status: 'active' | 'inactive' | 'completed' | 'on_hold' | string
  trainingStage: string | null
  certificateType: string | null
  certificateNumber: string | null
  medicalClass: string | null
  medicalExpiration: string | null
  flightReviewDate: string | null
  flightReviewDue: string | null
  ipcDate: string | null
  ipcDue: string | null
  rentalCheckoutDate: string | null
  rentalCurrencyDue: string | null
  totalHours: number
  picHours: number
  dualHours: number
  instrumentHours: number
  notes: string | null
  createdAt: string
  updatedAt: string
  courses: StudentCourseSummary[]
  recentEvaluations: StudentEvaluation[]
  overall: {
    enrolledCourses: number
    completedCourses: number
    totalLessons: number
    completedLessons: number
    totalSyllabusItems: number
    proficientItems: number
    videoProgressPercent: number
    syllabusCompletionPercent: number
    averagePerformanceRating: number | null
    lastActivityAt: string | null
  }
}

type BillingItemOption = {
  id: string
  name: string
  rate_cents: number | null
}

const formatDate = (value: string | null) => {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

const formatDateTime = (value: string | null) => {
  if (!value) return 'No activity yet'
  return new Date(value).toLocaleString()
}

const statusTone = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800'
    case 'completed':
      return 'bg-blue-100 text-blue-800'
    case 'on_hold':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

const ratingTone = (rating: number) => {
  if (rating >= 4.5) return 'text-emerald-600'
  if (rating >= 3) return 'text-amber-600'
  return 'text-rose-600'
}

const getGradeInfo = (rating: number): { arrows: string; label: string; color: string } => {
  switch (Math.round(rating)) {
    case 4:
      return { arrows: "⬆️⬆️", label: "Above Average", color: "#10B981" }
    case 3:
      return { arrows: "⬆️", label: "Slightly Above Average", color: "#3B82F6" }
    case 2:
      return { arrows: "⬇️", label: "Slightly Below Average", color: "#F59E0B" }
    case 1:
      return { arrows: "⬇️⬇️", label: "Below Average", color: "#EF4444" }
    default:
      return { arrows: "—", label: "Not Rated", color: "#6B7280" }
  }
}

const progressBarTone = (value: number) => {
  if (value >= 80) return 'bg-emerald-500'
  if (value >= 50) return 'bg-golden'
  return 'bg-slate-400'
}

const daysUntil = (value: string | null) => {
  if (!value) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(value)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function StudentMetric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-darkText">{value}</p>
      {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
    </div>
  )
}

export default function AdminStudentsPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [students, setStudents] = useState<StudentRecord[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'completed' | 'on_hold'>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [billingItems, setBillingItems] = useState<BillingItemOption[]>([])
  const [settingsDraft, setSettingsDraft] = useState({
    preferredCurrency: 'usd',
    stripeCustomerId: '',
    trainingItemIds: [] as string[],
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [homeworkActionLoadingId, setHomeworkActionLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      router.push('/login')
      return
    }

    void fetchStudents()
  }, [authLoading, isAdmin, router])

  const fetchStudents = async () => {
    setLoading((prev) => (students.length === 0 ? true : prev))
    setRefreshing(students.length > 0)
    setErrorMessage('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Missing admin session')
      }

      const response = await fetch('/api/admin/students', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load student records')
      }

      const nextStudents = (result.students || []) as StudentRecord[]
      setStudents(nextStudents)

      const { data: itemsData } = await supabase
        .from('items')
        .select('id, name, rate_cents')
        .eq('is_active', true)
        .order('name', { ascending: true })

      setBillingItems((itemsData || []) as BillingItemOption[])

      setSelectedStudentId((current) => {
        if (current && nextStudents.some((student) => student.id === current)) return current
        return nextStudents[0]?.id || ''
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load student records')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return students.filter((student) => {
      const matchesStatus = statusFilter === 'all' ? true : student.status === statusFilter
      const matchesQuery =
        query.length === 0 ||
        student.fullName.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        student.phone?.toLowerCase().includes(query) ||
        student.trainingStage?.toLowerCase().includes(query)

      return matchesStatus && matchesQuery
    })
  }, [searchQuery, statusFilter, students])

  const selectedStudent = useMemo(
    () => filteredStudents.find((student) => student.id === selectedStudentId) || students.find((student) => student.id === selectedStudentId) || null,
    [filteredStudents, selectedStudentId, students]
  )

  useEffect(() => {
    if (!selectedStudent) return

    setSettingsDraft({
      preferredCurrency: (selectedStudent.preferredCurrency || 'usd').toLowerCase(),
      stripeCustomerId: selectedStudent.stripeCustomerId || '',
      trainingItemIds: selectedStudent.trainingItemIds || [],
    })
    setSettingsMessage('')
  }, [selectedStudent])

  const handleSaveStudentSettings = async () => {
    if (!selectedStudent) return

    setSavingSettings(true)
    setSettingsMessage('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Missing session. Please sign in again.')
      }

      const response = await fetch(`/api/admin/students/${selectedStudent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          preferredCurrency: settingsDraft.preferredCurrency,
          stripeCustomerId: settingsDraft.stripeCustomerId,
          trainingItemIds: settingsDraft.trainingItemIds,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Unable to save student billing settings')
      }

      setStudents((previous) =>
        previous.map((student) =>
          student.id === selectedStudent.id
            ? {
                ...student,
                preferredCurrency: settingsDraft.preferredCurrency.toLowerCase(),
                stripeCustomerId: settingsDraft.stripeCustomerId || null,
                trainingItemIds: settingsDraft.trainingItemIds,
              }
            : student
        )
      )

      setSettingsMessage('Billing settings saved')
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : 'Unable to save billing settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleHomeworkEmailAction = async (evaluationId: string, action: 'send_now' | 'hold') => {
    setHomeworkActionLoadingId(evaluationId)
    setErrorMessage('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Missing session. Please sign in again.')
      }

      const response = await fetch('/api/admin/homework-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ evaluationId, action }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Unable to update homework email status')
      }

      await fetchStudents()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update homework email status')
    } finally {
      setHomeworkActionLoadingId(null)
    }
  }

  const overview = useMemo(() => {
    const overdueCount = students.reduce((count, student) => {
      const dueValues = [student.medicalExpiration, student.flightReviewDue, student.ipcDue, student.rentalCurrencyDue]
      return count + (dueValues.some((value) => {
        const days = daysUntil(value)
        return days !== null && days < 0
      }) ? 1 : 0)
    }, 0)

    return {
      totalStudents: students.length,
      linkedAccounts: students.filter((student) => student.hasLinkedAccount).length,
      enrolledStudents: students.filter((student) => student.overall.enrolledCourses > 0).length,
      overdueCount,
    }
  }, [students])

  const dueItems = useMemo(() => {
    if (!selectedStudent) return []

    return [
      { label: 'Medical', value: selectedStudent.medicalExpiration },
      { label: 'Flight Review', value: selectedStudent.flightReviewDue },
      { label: 'IPC', value: selectedStudent.ipcDue },
      { label: 'Rental Currency', value: selectedStudent.rentalCurrencyDue },
    ]
  }, [selectedStudent])

  return (
    <AdminPageShell
      title="Student Operations"
      description="See linked accounts, enrolled courses, syllabus mastery, video progress, currency dates, and recent debrief history for every student."
      actions={
        <>
          <button
            type="button"
            onClick={() => void fetchStudents()}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            href="/admin/enrollments"
            className="inline-flex items-center rounded-lg bg-golden px-4 py-2 text-sm font-semibold text-darkText hover:bg-amber-300"
          >
            Manage Enrollments
          </Link>
          <Link
            href="/admin/progress"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Open Debriefs
          </Link>
        </>
      }
      maxWidthClassName="max-w-7xl"
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetric label="Student Records" value={String(overview.totalStudents)} helper="All rows in the student table" />
        <StudentMetric label="Linked Accounts" value={String(overview.linkedAccounts)} helper="Students tied to an auth user" />
        <StudentMetric label="Currently Enrolled" value={String(overview.enrolledStudents)} helper="Students with at least one course" />
        <StudentMetric label="Needs Attention" value={String(overview.overdueCount)} helper="At least one overdue currency item" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-darkText">Students</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {filteredStudents.length} shown
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, email, phone, stage"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-golden"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-golden"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On hold</option>
              </select>
            </div>
          </div>

          <div className="max-h-[920px] overflow-y-auto p-3">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Loading student records...</div>
            ) : errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{errorMessage}</div>
            ) : filteredStudents.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No students matched your filters.</div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudent?.id === student.id
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-golden bg-amber-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold text-darkText">{student.fullName}</p>
                          <p className="mt-1 text-sm text-slate-600">{student.email || 'No email on file'}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(student.status)}`}>
                          {student.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                        <span className={`rounded-full px-2.5 py-1 ${student.hasLinkedAccount ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {student.hasLinkedAccount ? 'Linked account' : 'No linked account'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                          {student.overall.enrolledCourses} course{student.overall.enrolledCourses === 1 ? '' : 's'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                          {student.overall.videoProgressPercent}% video progress
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${progressBarTone(student.overall.syllabusCompletionPercent)}`}
                          style={{ width: `${Math.max(6, student.overall.syllabusCompletionPercent)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Syllabus mastery {student.overall.syllabusCompletionPercent}%
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          {!selectedStudent ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              Select a student to inspect their progress and records.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-3xl font-bold text-darkText">{selectedStudent.fullName}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(selectedStudent.status)}`}>
                        {selectedStudent.status.replace('_', ' ')}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedStudent.hasLinkedAccount ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {selectedStudent.hasLinkedAccount ? 'Auth linked' : 'Student record only'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {selectedStudent.email || 'No email'}
                      {selectedStudent.phone ? ` • ${selectedStudent.phone}` : ''}
                      {selectedStudent.trainingStage ? ` • ${selectedStudent.trainingStage}` : ''}
                    </p>
                    <p className="mt-3 text-sm text-slate-500">
                      Last activity: {formatDateTime(selectedStudent.overall.lastActivityAt)}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                    <StudentMetric
                      label="Video Progress"
                      value={`${selectedStudent.overall.videoProgressPercent}%`}
                      helper={`${selectedStudent.overall.completedLessons}/${selectedStudent.overall.totalLessons} lessons completed`}
                    />
                    <StudentMetric
                      label="Syllabus Mastery"
                      value={`${selectedStudent.overall.syllabusCompletionPercent}%`}
                      helper={`${selectedStudent.overall.proficientItems}/${selectedStudent.overall.totalSyllabusItems} proficient items`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StudentMetric
                  label="Enrolled Courses"
                  value={String(selectedStudent.overall.enrolledCourses)}
                  helper={`${selectedStudent.overall.completedCourses} completed`}
                />
                <StudentMetric
                  label="Total Flight Hours"
                  value={selectedStudent.totalHours.toFixed(1)}
                  helper={`PIC ${selectedStudent.picHours.toFixed(1)} • Dual ${selectedStudent.dualHours.toFixed(1)}`}
                />
                <StudentMetric
                  label="Instrument Hours"
                  value={selectedStudent.instrumentHours.toFixed(1)}
                  helper={selectedStudent.certificateType || 'Certificate type not set'}
                />
                <StudentMetric
                  label="Avg Evaluation"
                  value={selectedStudent.overall.averagePerformanceRating ? `${selectedStudent.overall.averagePerformanceRating}/5` : 'N/A'}
                  helper="Based on submitted lesson debriefs"
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-darkText">Course Progress</h3>
                  <p className="mt-1 text-sm text-slate-500">Per-course enrollment, lesson completion, and syllabus mastery.</p>
                  <div className="mt-5 space-y-4">
                    {selectedStudent.courses.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        This student is not enrolled in any course yet.
                      </div>
                    ) : (
                      selectedStudent.courses.map((course) => (
                        <div key={course.id} className="rounded-2xl border border-slate-200 p-5">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <h4 className="text-lg font-semibold text-darkText">{course.courseTitle}</h4>
                              <p className="mt-1 text-sm text-slate-500">
                                Assigned {formatDate(course.assignedAt)}
                                {course.startedAt ? ` • Started ${formatDate(course.startedAt)}` : ''}
                                {course.completedAt ? ` • Completed ${formatDate(course.completedAt)}` : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs font-semibold">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                                {course.completedLessons}/{course.totalLessons} lessons
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                                {course.proficientItems}/{course.totalSyllabusItems} proficient
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div>
                              <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                                <span>Video progress</span>
                                <span>{course.videoProgressPercent}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200">
                                <div className={`h-2 rounded-full ${progressBarTone(course.videoProgressPercent)}`} style={{ width: `${Math.max(6, course.videoProgressPercent)}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                                <span>Syllabus mastery</span>
                                <span>{course.syllabusCompletionPercent}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200">
                                <div className={`h-2 rounded-full ${progressBarTone(course.syllabusCompletionPercent)}`} style={{ width: `${Math.max(6, course.syllabusCompletionPercent)}%` }} />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Syllabus Score</p>
                              <p className="mt-2 text-lg font-semibold text-darkText">{course.averageSyllabusScore ? `${course.averageSyllabusScore}/5` : 'N/A'}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Debriefs</p>
                              <p className="mt-2 text-lg font-semibold text-darkText">{course.evaluationCount}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Avg Rating</p>
                              <p className={`mt-2 text-lg font-semibold ${course.averagePerformanceRating ? ratingTone(course.averagePerformanceRating) : 'text-slate-500'}`}>
                                {course.averagePerformanceRating ? `${course.averagePerformanceRating}/5` : 'N/A'}
                              </p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Last Course Activity</p>
                              <p className="mt-2 text-sm font-medium text-darkText">{formatDateTime(course.lastActivityAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-darkText">Training and Currency</h3>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">Certificate</span>
                        <span className="text-right font-medium text-darkText">{selectedStudent.certificateType || 'Not set'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">Certificate Number</span>
                        <span className="text-right font-medium text-darkText">{selectedStudent.certificateNumber || 'Not set'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">Medical Class</span>
                        <span className="text-right font-medium text-darkText">{selectedStudent.medicalClass || 'Not set'}</span>
                      </div>
                      {dueItems.map((item) => {
                        const remainingDays = daysUntil(item.value)
                        const tone = remainingDays === null ? 'text-slate-500' : remainingDays < 0 ? 'text-rose-600' : remainingDays <= 30 ? 'text-amber-600' : 'text-emerald-600'
                        return (
                          <div key={item.label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                            <span className="text-slate-500">{item.label}</span>
                            <div className="text-right">
                              <p className="font-medium text-darkText">{formatDate(item.value)}</p>
                              <p className={`text-xs ${tone}`}>
                                {remainingDays === null
                                  ? 'No due date'
                                  : remainingDays < 0
                                    ? `${Math.abs(remainingDays)} day(s) overdue`
                                    : `${remainingDays} day(s) remaining`}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-darkText">Billing Checkout Settings</h3>
                    <p className="mt-1 text-sm text-slate-500">Set preferred currency and default training products for this student.</p>

                    <div className="mt-4 space-y-4">
                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Preferred Currency
                        <input
                          value={settingsDraft.preferredCurrency.toUpperCase()}
                          onChange={(event) =>
                            setSettingsDraft((previous) => ({
                              ...previous,
                              preferredCurrency: event.target.value.toLowerCase().slice(0, 3),
                            }))
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="grid gap-1 text-sm font-medium text-slate-700">
                        Stripe Customer ID
                        <input
                          value={settingsDraft.stripeCustomerId}
                          onChange={(event) =>
                            setSettingsDraft((previous) => ({
                              ...previous,
                              stripeCustomerId: event.target.value,
                            }))
                          }
                          placeholder="cus_xxx"
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <div>
                        <p className="text-sm font-medium text-slate-700">Default Training Items</p>
                        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                          {billingItems.length === 0 ? (
                            <p className="text-sm text-slate-500">No active training items available.</p>
                          ) : (
                            billingItems.map((item) => {
                              const selected = settingsDraft.trainingItemIds.includes(item.id)
                              return (
                                <label key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(event) =>
                                      setSettingsDraft((previous) => ({
                                        ...previous,
                                        trainingItemIds: event.target.checked
                                          ? [...previous.trainingItemIds, item.id]
                                          : previous.trainingItemIds.filter((id) => id !== item.id),
                                      }))
                                    }
                                  />
                                  <span>
                                    {item.name}
                                    {typeof item.rate_cents === 'number' ? ` ($${(item.rate_cents / 100).toFixed(2)})` : ''}
                                  </span>
                                </label>
                              )
                            })
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleSaveStudentSettings()}
                        disabled={savingSettings}
                        className="rounded-lg bg-golden px-4 py-2 text-sm font-bold text-darkText disabled:opacity-60"
                      >
                        {savingSettings ? 'Saving...' : 'Save Billing Settings'}
                      </button>

                      {settingsMessage ? <p className="text-sm text-slate-600">{settingsMessage}</p> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-darkText">Student Record</h3>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">Linked account</span>
                        <span className="text-right font-medium text-darkText">{selectedStudent.hasLinkedAccount ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">Created</span>
                        <span className="text-right font-medium text-darkText">{formatDate(selectedStudent.createdAt)}</span>
                      </div>
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                        <span className="text-slate-500">Last updated</span>
                        <span className="text-right font-medium text-darkText">{formatDateTime(selectedStudent.updatedAt)}</span>
                      </div>
                      <div>
                        <p className="text-slate-500">Notes</p>
                        <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-darkText">
                          {selectedStudent.notes || 'No notes saved yet.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-darkText">Recent Lesson Evaluations</h3>
                <p className="mt-1 text-sm text-slate-500">Latest debriefs, strengths, homework, next-step notes, and instructor-only notes.</p>
                <div className="mt-5 space-y-4">
                  {selectedStudent.recentEvaluations.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      No lesson evaluations recorded for this student yet.
                    </div>
                  ) : (
                    selectedStudent.recentEvaluations.map((evaluation) => (
                      <div key={evaluation.id} className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-semibold text-darkText">{evaluation.courseTitle}</h4>
                              {evaluation.lessonTitle ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                  {evaluation.lessonTitle}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{formatDateTime(evaluation.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <p style={{ fontSize: "14px", fontWeight: 700, color: getGradeInfo(evaluation.performanceRating).color, marginBottom: "4px" }}>
                              {getGradeInfo(evaluation.performanceRating).arrows} {getGradeInfo(evaluation.performanceRating).label}
                            </p>
                            <p className="text-xs text-slate-500">{evaluation.emailSentAt ? 'Emailed to student' : 'Saved only'}</p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Homework Email</p>
                          <p className="mt-2 text-sm text-slate-700">
                            {evaluation.homeworkQueue?.status === 'sent'
                              ? `Sent ${formatDateTime(evaluation.homeworkQueue.sent_at)}`
                              : evaluation.homeworkQueue?.status === 'held'
                                ? 'On hold until instructor action'
                                : evaluation.homeworkQueue?.status === 'pending'
                                  ? `Queued for ${formatDateTime(evaluation.homeworkQueue.send_after_at)}`
                                  : evaluation.homeworkQueue?.status === 'failed'
                                    ? `Failed: ${evaluation.homeworkQueue.last_error || 'Unknown error'}`
                                    : 'Not queued yet'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleHomeworkEmailAction(evaluation.id, 'send_now')}
                              disabled={homeworkActionLoadingId === evaluation.id}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {homeworkActionLoadingId === evaluation.id ? 'Working...' : 'Push Homework Email'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleHomeworkEmailAction(evaluation.id, 'hold')}
                              disabled={homeworkActionLoadingId === evaluation.id}
                              className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
                            >
                              {homeworkActionLoadingId === evaluation.id ? 'Working...' : 'Hold Homework Email'}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Strengths</p>
                            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{evaluation.strengths || 'No strengths captured.'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Improvements</p>
                            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{evaluation.improvements || 'No improvement notes captured.'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Homework</p>
                            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{evaluation.homework || 'No homework assigned.'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next Lesson Focus</p>
                            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{evaluation.nextLessonFocus || 'No next-step focus recorded.'}</p>
                          </div>
                        </div>
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                            Instructor Notes (WILL NOT BE SHARED WITH STUDENT)
                          </p>
                          <p className="mt-2 text-sm text-amber-900 whitespace-pre-wrap">
                            {evaluation.instructorPrivateNotes || 'No instructor-only notes recorded.'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageShell>
  )
}
