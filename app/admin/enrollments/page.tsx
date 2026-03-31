"use client"

import { useEffect, useState } from "react"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface StudentEnrollment {
  student_record_id: string
  auth_user_id: string | null
  email: string
  full_name: string | null
  phone?: string | null
  status?: string | null
  has_linked_account: boolean
  is_enrolled: boolean
}

interface Course {
  id: string
  title: string
}

const normalizeEmail = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const studentQualityScore = (student: StudentEnrollment) => {
  let score = 0
  if (student.auth_user_id) score += 4
  if (student.full_name && student.full_name.trim().length > 0) score += 2
  if (student.email && student.email.trim().length > 0) score += 1
  if (student.phone && student.phone.trim().length > 0) score += 1
  if (student.status === "active") score += 1
  return score
}

const mergeStudentRecords = (existing: StudentEnrollment, incoming: StudentEnrollment) => {
  const preferred = studentQualityScore(incoming) > studentQualityScore(existing) ? incoming : existing
  return {
    ...preferred,
    has_linked_account: existing.has_linked_account || incoming.has_linked_account,
    is_enrolled: existing.is_enrolled || incoming.is_enrolled,
  }
}

export default function AdminStudentEnrollmentPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentEnrollment[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [collapsedDuplicates, setCollapsedDuplicates] = useState(0)
  const [normalizing, setNormalizing] = useState(false)
  const [normalizationMessage, setNormalizationMessage] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentEnrollment | null>(null)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAdmin) {
      router.push("/login")
      return
    }

    const fetchCourses = async () => {
      try {
        const { data } = await supabase
          .from("courses")
          .select("id, title")
          .order("title")

        setCourses(data || [])
      } catch (error) {
        console.error("Error loading courses:", error)
      }
    }

    fetchCourses()
  }, [authLoading, isAdmin, router])

  const handleCourseSelect = async (courseId: string) => {
    if (!courseId) {
      setSelectedCourse(null)
      setStudents([])
      setCollapsedDuplicates(0)
      return
    }

    setSelectedCourse(courseId)
    setLoading(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("Missing session token")
      }

      const [studentsResult, usersResponse, enrollmentsResult] = await Promise.all([
        supabase
          .from("students")
          .select("id, user_id, email, full_name, phone, status")
          .order("full_name", { ascending: true }),
        fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
        supabase
          .from("enrollments")
          .select("student_id")
          .eq("course_id", courseId),
      ])

      if (studentsResult.error) {
        throw studentsResult.error
      }

      if (!usersResponse.ok) {
        const errorBody = await usersResponse.json().catch(() => ({}))
        throw new Error(errorBody.error || "Failed to load linked users")
      }

      const usersJson = await usersResponse.json()
      const users: Array<{ id: string; email: string; full_name: string | null }> = usersJson.users || []
      const authUserIdByEmail = new Map(
        users
          .filter((user) => user.email)
          .map((user) => [user.email.trim().toLowerCase(), user.id])
      )

      const enrolledIds = new Set((enrollmentsResult.data || []).map((enrollment: any) => enrollment.student_id))

      const rawStudentList = (studentsResult.data || []).map((student) => {
        const resolvedAuthUserId = student.user_id || (student.email ? authUserIdByEmail.get(student.email.trim().toLowerCase()) || null : null)

        return {
          student_record_id: student.id,
          auth_user_id: resolvedAuthUserId,
          email: student.email || '',
          full_name: student.full_name,
          phone: student.phone || null,
          status: student.status || null,
          has_linked_account: Boolean(resolvedAuthUserId),
          is_enrolled: resolvedAuthUserId ? enrolledIds.has(resolvedAuthUserId) : false,
        }
      })

      const studentsByIdentity = new Map<string, StudentEnrollment>()
      let duplicateCount = 0

      rawStudentList.forEach((student) => {
        const normalizedEmail = normalizeEmail(student.email)
        const key = normalizedEmail
          ? `email:${normalizedEmail}`
          : student.auth_user_id
          ? `auth:${student.auth_user_id}`
          : `record:${student.student_record_id}`

        const existing = studentsByIdentity.get(key)
        if (!existing) {
          studentsByIdentity.set(key, student)
          return
        }

        duplicateCount += 1
        studentsByIdentity.set(key, mergeStudentRecords(existing, student))
      })

      const studentList = Array.from(studentsByIdentity.values()).sort((left, right) => {
        const leftLabel = (left.full_name || left.email || "").toLowerCase()
        const rightLabel = (right.full_name || right.email || "").toLowerCase()
        return leftLabel.localeCompare(rightLabel)
      })

      setStudents(studentList)
      setCollapsedDuplicates(duplicateCount)
    } catch (error) {
      console.error("Error loading students:", error)
    } finally {
      setLoading(false)
    }
  }

  const openEditStudent = (student: StudentEnrollment) => {
    const parts = (student.full_name || '').trim().split(/\s+/).filter(Boolean)
    const firstName = parts[0] || ''
    const lastName = parts.slice(1).join(' ')

    setEditingStudent(student)
    setEditForm({
      firstName,
      lastName,
      email: student.email,
      phone: student.phone || '',
    })
  }

  const closeEditStudent = () => {
    setEditingStudent(null)
    setEditForm({ firstName: '', lastName: '', email: '', phone: '' })
  }

  const saveStudentProfile = async () => {
    if (!editingStudent) return
    if (!editForm.email.trim()) {
      alert('Email is required')
      return
    }

    setSavingProfile(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) throw new Error('Missing session token')

      if (!editingStudent.auth_user_id) {
        throw new Error('This student record is not linked to a signed-in account yet')
      }

      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: editingStudent.auth_user_id,
          email: editForm.email.trim(),
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          phone: editForm.phone.trim(),
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Failed to update user')

      await handleCourseSelect(selectedCourse || '')
      closeEditStudent()
    } catch (error) {
      console.error('Error updating enrolled user profile:', error)
      alert(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleToggleEnrollment = async (studentAuthUserId: string | null, isEnrolled: boolean) => {
    if (!selectedCourse || !studentAuthUserId) return

    try {
      if (isEnrolled) {
        const { error } = await supabase
          .from("enrollments")
          .delete()
          .eq("course_id", selectedCourse)
          .eq("student_id", studentAuthUserId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("enrollments")
          .insert([
            {
              course_id: selectedCourse,
              student_id: studentAuthUserId,
            },
          ])

        if (error) throw error
      }

      setStudents(
        students.map((student) =>
          student.auth_user_id === studentAuthUserId ? { ...student, is_enrolled: !isEnrolled } : student
        )
      )
    } catch (error) {
      console.error("Error updating enrollment:", error)
      alert("Failed to update enrollment")
    }
  }

  const filteredStudents = students.filter(
    (student) =>
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const enrolledCount = students.filter((student) => student.is_enrolled).length

  const handleNormalizeStudents = async () => {
    setNormalizing(true)
    setNormalizationMessage('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Missing admin session token')
      }

      const response = await fetch('/api/admin/students/normalize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Unable to normalize student records')
      }

      setNormalizationMessage(
        `Normalization complete: ${result.deleted || 0} duplicates removed, ${result.updated || 0} records updated, ${result.unresolved || 0} still missing a proper name or email.`
      )

      if (selectedCourse) {
        await handleCourseSelect(selectedCourse)
      }
    } catch (error) {
      setNormalizationMessage(error instanceof Error ? error.message : 'Unable to normalize student records')
    } finally {
      setNormalizing(false)
    }
  }

  return (
    <AdminPageShell
      title="Assign Students to Courses"
      description="Choose from student records, not prospects. Enrollment requires a linked signed-in account so course access maps to the correct learner."
    >

      <div style={{ marginBottom: "40px" }}>
        <label style={{ display: "block", marginBottom: "10px", fontWeight: "600" }}>
          Select Course
        </label>
        <select
          value={selectedCourse || ""}
          onChange={(e) => handleCourseSelect(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #D1D5DB",
            fontSize: "16px",
          }}
        >
          <option value="">-- Select a course --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <>
          <div style={{ marginBottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => void handleNormalizeStudents()}
              disabled={normalizing}
              style={{
                backgroundColor: '#1E3A8A',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                cursor: normalizing ? 'wait' : 'pointer',
                opacity: normalizing ? 0.75 : 1,
              }}
            >
              {normalizing ? 'Normalizing Student Records...' : 'Normalize Student Records'}
            </button>
            {normalizationMessage ? <p style={{ margin: 0, color: '#334155', fontSize: '14px' }}>{normalizationMessage}</p> : null}
          </div>

          <div
            style={{
              marginBottom: "14px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "10px 12px",
              color: "#334155",
              fontSize: "14px",
            }}
          >
            Showing {students.length} unique students for this course, with {enrolledCount} currently enrolled.
            {collapsedDuplicates > 0 ? ` Collapsed ${collapsedDuplicates} duplicate student records by linked account/email.` : ""}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                fontSize: "16px",
              }}
            />
          </div>

          {loading ? (
            <p>Loading students...</p>
          ) : filteredStudents.length === 0 ? (
            <div
              style={{
                backgroundColor: "#F3F4F6",
                border: "1px solid #D1D5DB",
                borderRadius: "8px",
                padding: "20px",
                color: "#6B7280",
                textAlign: "center",
              }}
            >
              <p>No students found.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredStudents.map((student) => (
                <div
                  key={student.student_record_id}
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    padding: "15px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: '12px',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: "600", margin: "0 0 5px 0" }}>
                      {student.full_name || "No name"}
                    </p>
                    <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
                      {student.email || 'No email on file'}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {student.status ? (
                        <span style={{ fontSize: '12px', backgroundColor: '#F3F4F6', color: '#475569', padding: '4px 8px', borderRadius: '999px', fontWeight: 600 }}>
                          {student.status}
                        </span>
                      ) : null}
                      <span style={{ fontSize: '12px', backgroundColor: student.has_linked_account ? '#DCFCE7' : '#FEF3C7', color: student.has_linked_account ? '#166534' : '#92400E', padding: '4px 8px', borderRadius: '999px', fontWeight: 600 }}>
                        {student.has_linked_account ? 'Linked account' : 'Needs account link'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => openEditStudent(student)}
                      disabled={!student.auth_user_id}
                      style={{
                        backgroundColor: student.auth_user_id ? '#1D4ED8' : '#CBD5E1',
                        color: student.auth_user_id ? 'white' : '#475569',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: student.auth_user_id ? 'pointer' : 'not-allowed',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleEnrollment(student.auth_user_id, student.is_enrolled)}
                      disabled={!student.auth_user_id}
                      style={{
                        backgroundColor: !student.auth_user_id ? '#CBD5E1' : student.is_enrolled ? "#EF4444" : "#10B981",
                        color: !student.auth_user_id ? '#475569' : "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: !student.auth_user_id ? 'not-allowed' : "pointer",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {!student.auth_user_id ? "No Account" : student.is_enrolled ? "Remove" : "Enroll"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editingStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '16px',
          }}
        >
          <div style={{ background: 'white', borderRadius: '10px', width: '100%', maxWidth: '540px', padding: '22px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '14px', fontSize: '20px', fontWeight: 700 }}>Edit Enrolled Student</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>First Name</label>
                <input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Last Name</label>
                <input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Email</label>
              <input
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
              />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Phone</label>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={closeEditStudent}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={saveStudentProfile}
                disabled={savingProfile}
                style={{ padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#C59A2A', color: '#111827', fontWeight: 700, cursor: 'pointer', opacity: savingProfile ? 0.7 : 1 }}
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
