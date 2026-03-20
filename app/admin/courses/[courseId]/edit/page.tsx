"use client"

import { useEffect, useState } from "react"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"

interface Unit {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  order_index: number
  videos: Video[]
}

interface Video {
  id: string
  title: string
  storage_path: string
}

interface Course {
  id: string
  title: string
  description: string | null
}

export default function EditCoursePage() {
  const params = useParams()
  const courseId = params.courseId as string
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [newUnitTitle, setNewUnitTitle] = useState("")
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [editingUnitTitle, setEditingUnitTitle] = useState("")
  const [newLessonUnit, setNewLessonUnit] = useState<string | null>(null)
  const [newLessonTitle, setNewLessonTitle] = useState("")
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

    const fetchCourse = async () => {
      try {
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("id, title, description")
          .eq("id", courseId)
          .single()

        if (courseError) throw courseError
        setCourse(courseData)

        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select(
            `
            id,
            title,
            order_index,
            lessons (
              id,
              title,
              order_index,
              videos (id, title, storage_path)
            )
          `
          )
          .eq("course_id", courseId)
          .order("order_index", { ascending: true })

        if (unitsError) throw unitsError
        setUnits(unitsData || [])
      } catch (error) {
        console.error("Error loading course:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [authLoading, courseId, isAdmin, router])

  const handleAddUnit = async () => {
    if (!newUnitTitle.trim()) return

    try {
      const { data, error } = await supabase
        .from("units")
        .insert([
          {
            course_id: courseId,
            title: newUnitTitle,
            order_index: units.length,
          },
        ])
        .select("id, title, order_index")

      if (error) throw error
      if (data) {
        setUnits([...units, { ...data[0], lessons: [] }])
        setNewUnitTitle("")
      }
    } catch (error) {
      console.error("Error adding unit:", error)
    }
  }

  const handleUpdateUnit = async (unitId: string) => {
    if (!editingUnitTitle.trim()) return

    try {
      const { error } = await supabase
        .from("units")
        .update({ title: editingUnitTitle })
        .eq("id", unitId)

      if (error) throw error
      setUnits(
        units.map((u) => (u.id === unitId ? { ...u, title: editingUnitTitle } : u))
      )
      setEditingUnitId(null)
    } catch (error) {
      console.error("Error updating unit:", error)
    }
  }

  const handleAddLesson = async (unitId: string) => {
    if (!newLessonTitle.trim()) return

    try {
      const { data, error } = await supabase
        .from("lessons")
        .insert([
          {
            unit_id: unitId,
            title: newLessonTitle,
            order_index: (units.find((u) => u.id === unitId)?.lessons.length || 0),
          },
        ])
        .select("id, title, order_index")

      if (error) throw error
      if (data) {
        setUnits(
          units.map((u) =>
            u.id === unitId
              ? { ...u, lessons: [...u.lessons, { ...data[0], videos: [] }] }
              : u
          )
        )
        setNewLessonTitle("")
        setNewLessonUnit(null)
      }
    } catch (error) {
      console.error("Error adding lesson:", error)
    }
  }

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("Delete this unit and all its lessons?")) return

    try {
      const { error } = await supabase.from("units").delete().eq("id", unitId)
      if (error) throw error
      setUnits(units.filter((u) => u.id !== unitId))
    } catch (error) {
      console.error("Error deleting unit:", error)
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Delete this lesson and its videos?")) return

    try {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId)
      if (error) throw error
      setUnits(
        units.map((u) => ({
          ...u,
          lessons: u.lessons.filter((l) => l.id !== lessonId),
        }))
      )
    } catch (error) {
      console.error("Error deleting lesson:", error)
    }
  }

  if (loading)
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Loading course...</p>
      </div>
    )

  return (
    <AdminPageShell
      title={course?.title || "Edit Course"}
      description={course?.description || "Manage units, lessons, and video structure for this course."}
      backLinks={[{ href: "/admin", label: "Back to Admin" }, { href: "/admin/courses", label: "Back to Courses" }]}
      maxWidthClassName="max-w-5xl"
    >
      {course && (
        <>
          <div style={{ marginBottom: "50px" }}>
            <h2 style={{ marginBottom: "20px" }}>Units & Lessons</h2>

            {units.map((unit) => (
              <div
                key={unit.id}
                style={{
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  {editingUnitId === unit.id ? (
                    <div style={{ display: "flex", gap: "10px", flex: 1 }}>
                      <input
                        type="text"
                        value={editingUnitTitle}
                        onChange={(e) => setEditingUnitTitle(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid #D1D5DB",
                        }}
                      />
                      <button
                        onClick={() => handleUpdateUnit(unit.id)}
                        style={{
                          backgroundColor: "#10B981",
                          color: "white",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUnitId(null)}
                        style={{
                          backgroundColor: "#6B7280",
                          color: "white",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 style={{ marginBottom: 0 }}>{unit.title}</h3>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => {
                            setEditingUnitId(unit.id)
                            setEditingUnitTitle(unit.title)
                          }}
                          style={{
                            backgroundColor: "#3B82F6",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          style={{
                            backgroundColor: "#EF4444",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Lessons */}
                <div style={{ marginLeft: "20px", marginBottom: "20px" }}>
                  {unit.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      style={{
                        backgroundColor: "white",
                        border: "1px solid #D1D5DB",
                        borderRadius: "6px",
                        padding: "15px",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <h4 style={{ marginBottom: "5px", marginTop: 0 }}>
                            {lesson.title}
                          </h4>
                          {lesson.videos.length > 0 && (
                            <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>
                              {lesson.videos.length} video{lesson.videos.length !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <Link
                            href={`/admin/lessons/${lesson.id}`}
                            style={{
                              backgroundColor: "#3B82F6",
                              color: "white",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              textDecoration: "none",
                              fontSize: "12px",
                              fontWeight: "600",
                            }}
                          >
                            Manage Videos
                          </Link>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            style={{
                              backgroundColor: "#EF4444",
                              color: "white",
                              padding: "6px 12px",
                              borderRadius: "4px",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "600",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Lesson Form */}
                  {newLessonUnit === unit.id ? (
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <input
                        type="text"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="Lesson title..."
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "6px",
                          border: "1px solid #D1D5DB",
                        }}
                      />
                      <button
                        onClick={() => handleAddLesson(unit.id)}
                        style={{
                          backgroundColor: "#10B981",
                          color: "white",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setNewLessonUnit(null)}
                        style={{
                          backgroundColor: "#6B7280",
                          color: "white",
                          padding: "8px 16px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewLessonUnit(unit.id)}
                      style={{
                        backgroundColor: "#F3F4F6",
                        border: "1px dashed #D1D5DB",
                        borderRadius: "6px",
                        padding: "10px",
                        cursor: "pointer",
                        fontWeight: "600",
                        color: "#6B7280",
                        width: "100%",
                        marginTop: "10px",
                      }}
                    >
                      + Add Lesson
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add Unit Form */}
            <div
              style={{
                backgroundColor: "#F9FAFB",
                border: "2px dashed #D1D5DB",
                borderRadius: "8px",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={newUnitTitle}
                  onChange={(e) => setNewUnitTitle(e.target.value)}
                  placeholder="New unit name (e.g., Module 1)..."
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                  }}
                />
                <button
                  onClick={handleAddUnit}
                  style={{
                    backgroundColor: "#C59A2A",
                    color: "white",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Add Unit
                </button>
              </div>
            </div>
          </div>

          <Link
            href="/admin/courses"
            style={{
              display: "inline-block",
              backgroundColor: "#374151",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            Done Editing
          </Link>
        </>
      )}
    </AdminPageShell>
  )
}
