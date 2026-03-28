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

interface SyllabusItem {
  id: string
  course_id: string
  title: string
  description: string | null
  stage: string | null
  order_index: number
}

export default function AdminCoursesPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null)
  const [syllabusItems, setSyllabusItems] = useState<Record<string, SyllabusItem[]>>({})
  const [newItemTitle, setNewItemTitle] = useState("")
  const [newItemStage, setNewItemStage] = useState("")
  const [newItemDescription, setNewItemDescription] = useState("")
  const [newItemOrder, setNewItemOrder] = useState(0)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemTitle, setEditingItemTitle] = useState("")
  const [editingItemStage, setEditingItemStage] = useState("")
  const [editingItemDescription, setEditingItemDescription] = useState("")
  const [savingItem, setSavingItem] = useState(false)
  const [savingItemUpdate, setSavingItemUpdate] = useState(false)
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>({})

  const fetchSyllabusItems = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from("syllabus_items")
        .select("id, course_id, title, description, stage, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })

      if (error) throw error
      setSyllabusItems((prev) => ({
        ...prev,
        [courseId]: (data as SyllabusItem[] | null) || [],
      }))
      setNewItemOrder((data?.length || 0) + 1)
    } catch (error) {
      console.error("Error loading syllabus items:", error)
    }
  }

  const handleExpandCourse = (courseId: string) => {
    setExpandedCourseId(expandedCourseId === courseId ? null : courseId)
    if (!syllabusItems[courseId]) {
      fetchSyllabusItems(courseId)
    }
  }

  const handleCreateItem = async (courseId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemTitle.trim()) return

    setSavingItem(true)
    setStatusMessages((prev) => ({ ...prev, [courseId]: "" }))

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from("syllabus_items").insert([
      {
        course_id: courseId,
        title: newItemTitle.trim(),
        description: newItemDescription.trim() || null,
        stage: newItemStage.trim() || null,
        order_index: newItemOrder,
        created_by: user?.id,
      },
    ])

    if (error) {
      setStatusMessages((prev) => ({
        ...prev,
        [courseId]: `Failed to create syllabus item: ${error.message}`,
      }))
    } else {
      setStatusMessages((prev) => ({ ...prev, [courseId]: "Syllabus item created" }))
      setNewItemTitle("")
      setNewItemDescription("")
      setNewItemStage("")
      await fetchSyllabusItems(courseId)
    }

    setSavingItem(false)
  }

  const handleUpdateItem = async (courseId: string, itemId: string) => {
    if (!editingItemTitle.trim()) return

    setSavingItemUpdate(true)
    setStatusMessages((prev) => ({ ...prev, [courseId]: "" }))

    const { error } = await supabase
      .from("syllabus_items")
      .update({
        title: editingItemTitle.trim(),
        description: editingItemDescription.trim() || null,
        stage: editingItemStage.trim() || null,
      })
      .eq("id", itemId)

    if (error) {
      setStatusMessages((prev) => ({
        ...prev,
        [courseId]: `Failed to update syllabus item: ${error.message}`,
      }))
    } else {
      setStatusMessages((prev) => ({
        ...prev,
        [courseId]: "Syllabus item updated",
      }))
      setEditingItemId(null)
      await fetchSyllabusItems(courseId)
    }

    setSavingItemUpdate(false)
  }

  const handleDeleteItem = async (courseId: string, itemId: string) => {
    if (!confirm("Delete this syllabus item?")) return

    const { error } = await supabase.from("syllabus_items").delete().eq("id", itemId)
    if (error) {
      setStatusMessages((prev) => ({
        ...prev,
        [courseId]: `Failed to delete syllabus item: ${error.message}`,
      }))
      return
    }

    setStatusMessages((prev) => ({
      ...prev,
      [courseId]: "Syllabus item deleted",
    }))
    await fetchSyllabusItems(courseId)
  }

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
            <div key={course.id} style={{ border: "1px solid #E5E7EB", borderRadius: "8px", overflow: "hidden" }}>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  borderBottom: expandedCourseId === course.id ? "1px solid #E5E7EB" : "none",
                }}
                onClick={() => handleExpandCourse(course.id)}
              >
                <div style={{ flex: 1 }}>
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

                <div style={{ display: "flex", gap: "10px", marginLeft: "20px" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePublish(course.id, course.is_published)
                    }}
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
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      backgroundColor: "#3B82F6",
                      color: "white",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      display: "inline-block",
                    }}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(course.id)
                    }}
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

              {/* Syllabus Builder Section */}
              {expandedCourseId === course.id && (
                <div
                  style={{
                    backgroundColor: "#F9FAFB",
                    padding: "20px",
                    borderTop: "1px solid #E5E7EB",
                  }}
                >
                  <h4 style={{ marginTop: 0 }}>Syllabus Builder</h4>
                  <form onSubmit={(e) => handleCreateItem(course.id, e)} style={{ display: "grid", gap: "10px", marginBottom: "20px" }}>
                    <input
                      value={newItemTitle}
                      onChange={(e) => setNewItemTitle(e.target.value)}
                      placeholder="Item title (e.g. Slow Flight)"
                      required
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
                    />
                    <input
                      value={newItemStage}
                      onChange={(e) => setNewItemStage(e.target.value)}
                      placeholder="Stage (e.g. Pre-solo)"
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
                    />
                    <textarea
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
                    />
                    <input
                      value={newItemOrder}
                      onChange={(e) => setNewItemOrder(Number(e.target.value))}
                      type="number"
                      min={0}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "140px" }}
                    />
                    <button
                      type="submit"
                      disabled={savingItem}
                      style={{
                        background: "#C59A2A",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        padding: "10px 16px",
                        fontWeight: 600,
                        cursor: "pointer",
                        width: "fit-content",
                        opacity: savingItem ? 0.7 : 1,
                      }}
                    >
                      {savingItem ? "Saving..." : "Add Syllabus Item"}
                    </button>
                  </form>

                  {syllabusItems[course.id]?.length === 0 ? (
                    <p style={{ color: "#6B7280" }}>No syllabus items yet.</p>
                  ) : (
                    <div style={{ display: "grid", gap: "8px" }}>
                      {syllabusItems[course.id]?.map((item) => (
                        <div key={item.id} style={{ border: "1px solid #E5E7EB", borderRadius: "8px", padding: "10px", backgroundColor: "white" }}>
                          {editingItemId === item.id ? (
                            <div style={{ display: "grid", gap: "8px" }}>
                              <input
                                value={editingItemTitle}
                                onChange={(e) => setEditingItemTitle(e.target.value)}
                                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }}
                              />
                              <input
                                value={editingItemStage}
                                onChange={(e) => setEditingItemStage(e.target.value)}
                                placeholder="Stage"
                                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }}
                              />
                              <textarea
                                value={editingItemDescription}
                                onChange={(e) => setEditingItemDescription(e.target.value)}
                                rows={2}
                                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB" }}
                              />
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  type="button"
                                  disabled={savingItemUpdate}
                                  onClick={() => void handleUpdateItem(course.id, item.id)}
                                  style={{ background: "#10B981", color: "white", border: "none", borderRadius: "6px", padding: "8px 10px", cursor: "pointer", fontWeight: 600 }}
                                >
                                  {savingItemUpdate ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  style={{ background: "#6B7280", color: "white", border: "none", borderRadius: "6px", padding: "8px 10px", cursor: "pointer", fontWeight: 600 }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                                <p style={{ margin: 0, fontWeight: 600 }}>
                                  {item.order_index}. {item.title}
                                </p>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingItemId(item.id)
                                      setEditingItemTitle(item.title)
                                      setEditingItemDescription(item.description || "")
                                      setEditingItemStage(item.stage || "")
                                    }}
                                    style={{ background: "#3B82F6", color: "white", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteItem(course.id, item.id)}
                                    style={{ background: "#EF4444", color: "white", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              {item.stage && <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#6B7280" }}>Stage: {item.stage}</p>}
                              {item.description && <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#6B7280" }}>{item.description}</p>}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {statusMessages[course.id] && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px",
                        borderRadius: "6px",
                        backgroundColor: "#F0FDF4",
                        border: "1px solid #DCFCE7",
                        color: "#166534",
                        fontSize: "14px",
                      }}
                    >
                      {statusMessages[course.id]}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  )
}
