"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import AdminPageShell from "@/app/components/AdminPageShell"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Course {
  id: string
  title: string
  description: string | null
  is_published: boolean
  created_at: string
}

export default function AdminCoursesPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAdmin) {
      setLoading(false)
      router.push("/login")
      return
    }

    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id, title, description, is_published, created_at")
          .order("created_at", { ascending: false })

        if (error) throw error
        setCourses(data || [])
      } catch (error) {
        console.error("Error loading courses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [authLoading, isAdmin, router])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the course and all lessons.")) return

    try {
      const { error } = await supabase.from("courses").delete().eq("id", id)
      if (error) throw error
      setCourses(courses.filter((c) => c.id !== id))
    } catch (error) {
      console.error("Error deleting course:", error)
      alert("Failed to delete course")
    }
  }

  const handlePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: !currentStatus })
        .eq("id", id)

      if (error) throw error
      setCourses(
        courses.map((c) => (c.id === id ? { ...c, is_published: !currentStatus } : c))
      )
    } catch (error) {
      console.error("Error updating course:", error)
      alert("Failed to update course")
    }
  }

  return (
    <AdminPageShell
      title="Manage Courses"
      description="Create, publish, and organize course content for the learning platform."
      actions={[
        <Link
          key="create-course"
          href="/admin/courses/create"
          className="inline-flex items-center rounded-lg bg-golden px-4 py-3 font-semibold text-darkText transition-opacity hover:opacity-90"
        >
          Create New Course
        </Link>,
        <Link
          key="assign-students"
          href="/admin/enrollments"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Assign Students
        </Link>,
      ]}
    >

      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <div
          style={{
            backgroundColor: "#F3F4F6",
            border: "1px solid #D1D5DB",
            borderRadius: "8px",
            padding: "40px 20px",
            textAlign: "center",
            color: "#6B7280",
          }}
        >
          <p>No courses yet. Create one to get started.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {courses.map((course) => (
            <div
              key={course.id}
              style={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ marginTop: 0, marginBottom: "5px" }}>{course.title}</h3>
                {course.description && (
                  <p style={{ color: "#6B7280", fontSize: "14px", margin: 0 }}>
                    {course.description.substring(0, 100)}...
                  </p>
                )}
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#9CA3AF" }}>
                  Status:{" "}
                  <span
                    style={{
                      backgroundColor: course.is_published ? "#D1FAE5" : "#FEE2E2",
                      color: course.is_published ? "#065F46" : "#991B1B",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      marginLeft: "5px",
                    }}
                  >
                    {course.is_published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => handlePublish(course.id, course.is_published)}
                  style={{
                    backgroundColor: course.is_published ? "#EF4444" : "#10B981",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {course.is_published ? "Unpublish" : "Publish"}
                </button>
                <Link
                  href={`/admin/courses/${course.id}/edit`}
                  style={{
                    backgroundColor: "#3B82F6",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(course.id)}
                  style={{
                    backgroundColor: "#6B7280",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  )
}
