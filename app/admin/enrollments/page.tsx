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
        is_enrolled: enrolledIds.has(user.id),
      }))

      setStudents(studentList)
    } catch (error) {
      console.error("Error loading students:", error)
    } finally {
      setLoading(false)
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
      backLinks={[{ href: "/admin", label: "Back to Admin" }, { href: "/admin/courses", label: "Back to Courses" }]}
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
              ))}
            </div>
          )}
        </>
      )}
    </AdminPageShell>
  )
}
