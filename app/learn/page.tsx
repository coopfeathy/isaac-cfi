"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface Course {
  id: string
  title: string
  description: string | null
  is_published: boolean
  enrollment?: { id: string }
}

export default function LearnPage() {
  const { user, isAdmin } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Get courses the student is enrolled in
        const { data, error } = await supabase
          .from("enrollments")
          .select("course_id, courses!inner(id, title, description, is_published)")
          .eq("student_id", user.id)

        if (error) throw error

        const enrolledCourses = data?.map((e: any) => ({
          ...e.courses,
          enrollment: { id: e.course_id }
        })) || []

        setCourses(enrolledCourses)
      } catch (error) {
        console.error("Error loading courses:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user])

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ marginBottom: "10px" }}>Flight Training Courses</h1>
      <p style={{ color: "#6B7280", marginBottom: "40px" }}>
        Complete lessons and track your progress
      </p>

      {isAdmin && (
        <div style={{ marginBottom: "30px" }}>
          <Link
            href="/admin/courses"
            style={{
              display: "inline-block",
              backgroundColor: "#C59A2A",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            Manage Courses (Admin)
          </Link>
        </div>
      )}

      {!user ? (
        <div
          style={{
            backgroundColor: "#FEF3C7",
            border: "1px solid #FCD34D",
            borderRadius: "8px",
            padding: "20px",
            color: "#92400E",
          }}
        >
          <p>
            Sign in to access your courses.{" "}
            <Link href="/login" style={{ color: "#1E40AF", textDecoration: "underline" }}>
              Sign in here
            </Link>
          </p>
        </div>
      ) : loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <div
          style={{
            backgroundColor: "#F3F4F6",
            border: "1px solid #D1D5DB",
            borderRadius: "8px",
            padding: "20px",
            textAlign: "center",
            color: "#6B7280",
          }}
        >
          <p>No courses assigned yet. Contact your instructor.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/learn/${course.id}`}
              style={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "20px",
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)"
                e.currentTarget.style.transform = "translateY(-2px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <h3 style={{ marginBottom: "10px", marginTop: 0 }}>{course.title}</h3>
              {course.description && (
                <p style={{ color: "#6B7280", marginBottom: "10px", fontSize: "14px" }}>
                  {course.description}
                </p>
              )}
              <div style={{ color: "#C59A2A", fontWeight: "600", fontSize: "14px" }}>
                View Course →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
