"use client"

import { useEffect, useState } from "react"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface StudentEnrollment {
  id: string
  email: string
  full_name: string | null
  phone?: string | null
  is_enrolled: boolean
}

interface Course {
  id: string
  title: string
}

export default function AdminStudentEnrollmentPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentEnrollment[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
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

      const usersResponse = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!usersResponse.ok) {
        const errorBody = await usersResponse.json().catch(() => ({}))
        throw new Error(errorBody.error || "Failed to load users")
      }

      const usersJson = await usersResponse.json()
      const users: Array<{ id: string; email: string; full_name: string | null }> = usersJson.users || []

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, phone')
        .in('id', users.map((u) => u.id))

      const phoneById = new Map((profileRows || []).map((row) => [row.id, row.phone]))

      // Get enrollments for this course
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)

      const enrolledIds = new Set(enrollments?.map((e: any) => e.student_id))

      const studentList = users.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: phoneById.get(user.id) || null,
        is_enrolled: enrolledIds.has(user.id),
      }))

      setStudents(studentList)
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

      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: editingStudent.id,
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

  const handleToggleEnrollment = async (studentId: string, isEnrolled: boolean) => {
    if (!selectedCourse) return

    try {
      if (isEnrolled) {
        // Unenroll
        const { error } = await supabase
          .from("enrollments")
          .delete()
          .eq("course_id", selectedCourse)
          .eq("student_id", studentId)

        if (error) throw error
      } else {
        // Enroll
        const { error } = await supabase
          .from("enrollments")
          .insert([
            {
              course_id: selectedCourse,
              student_id: studentId,
            },
          ])

        if (error) throw error
      }

      setStudents(
        students.map((s) =>
          s.id === studentId ? { ...s, is_enrolled: !isEnrolled } : s
        )
      )
    } catch (error) {
      console.error("Error updating enrollment:", error)
      alert("Failed to update enrollment")
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AdminPageShell
      title="Assign Students to Courses"
      description="Search enrolled users, open a course roster, and manage course access from one place."
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
                  key={student.id}
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    padding: "15px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: "600", margin: "0 0 5px 0" }}>
                      {student.full_name || "No name"}
                    </p>
                    <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
                      {student.email}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => openEditStudent(student)}
                      style={{
                        backgroundColor: '#1D4ED8',
                        color: 'white',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleEnrollment(student.id, student.is_enrolled)}
                      style={{
                        backgroundColor: student.is_enrolled ? "#EF4444" : "#10B981",
                        color: "white",
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {student.is_enrolled ? "Remove" : "Enroll"}
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
