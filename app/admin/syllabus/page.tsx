"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import AdminPageShell from "@/app/components/AdminPageShell"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface Course {
  id: string
  title: string
}

interface SyllabusLesson {
  id: string
  course_id: string
  lesson_number: number
  title: string
  description: string | null
  stage: string | null
  ground_topics: string[]
  flight_maneuvers: string[]
  completion_standards: string | null
  order_index: number
  created_at: string
}

const STAGE_OPTIONS = ["pre-solo", "solo", "cross-country", "checkride-prep"] as const

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  "pre-solo": { bg: "#DBEAFE", text: "#1E40AF" },
  "solo": { bg: "#E0E7FF", text: "#3730A3" },
  "cross-country": { bg: "#FEF3C7", text: "#92400E" },
  "checkride-prep": { bg: "#D1FAE5", text: "#065F46" },
}

export default function AdminSyllabusPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [lessons, setLessons] = useState<SyllabusLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(false)

  // Create form state
  const [newLessonNumber, setNewLessonNumber] = useState(1)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newStage, setNewStage] = useState("")
  const [newGroundTopics, setNewGroundTopics] = useState("")
  const [newFlightManeuvers, setNewFlightManeuvers] = useState("")
  const [newCompletionStandards, setNewCompletionStandards] = useState("")
  const [newOrderIndex, setNewOrderIndex] = useState(1)
  const [savingCreate, setSavingCreate] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLessonNumber, setEditLessonNumber] = useState(0)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editStage, setEditStage] = useState("")
  const [editGroundTopics, setEditGroundTopics] = useState("")
  const [editFlightManeuvers, setEditFlightManeuvers] = useState("")
  const [editCompletionStandards, setEditCompletionStandards] = useState("")
  const [editOrderIndex, setEditOrderIndex] = useState(0)
  const [savingUpdate, setSavingUpdate] = useState(false)

  const [statusMessage, setStatusMessage] = useState("")

  const fetchLessons = async (courseId: string) => {
    setLoadingLessons(true)
    try {
      const { data, error } = await supabase
        .from("syllabus_lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })

      if (error) throw error
      const parsed = (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        ground_topics: Array.isArray(row.ground_topics) ? row.ground_topics : [],
        flight_maneuvers: Array.isArray(row.flight_maneuvers) ? row.flight_maneuvers : [],
      })) as SyllabusLesson[]
      setLessons(parsed)
      setNewLessonNumber(parsed.length + 1)
      setNewOrderIndex(parsed.length + 1)
    } catch (error) {
      console.error("Error loading syllabus lessons:", error)
    } finally {
      setLoadingLessons(false)
    }
  }

  useEffect(() => {
    if (authLoading) return

    if (!isAdmin) {
      setLoading(false)
      router.push("/login")
      return
    }

    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id, title")
          .order("title", { ascending: true })

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

  useEffect(() => {
    if (selectedCourseId) {
      fetchLessons(selectedCourseId)
    } else {
      setLessons([])
    }
  }, [selectedCourseId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !selectedCourseId) return

    setSavingCreate(true)
    setStatusMessage("")

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from("syllabus_lessons").insert([
      {
        course_id: selectedCourseId,
        lesson_number: newLessonNumber,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        stage: newStage || null,
        ground_topics: newGroundTopics.split("\n").filter(Boolean).map((s) => s.trim()),
        flight_maneuvers: newFlightManeuvers.split("\n").filter(Boolean).map((s) => s.trim()),
        completion_standards: newCompletionStandards.trim() || null,
        order_index: newOrderIndex,
        created_by: user?.id,
      },
    ])

    if (error) {
      setStatusMessage(`Failed to create lesson: ${error.message}`)
    } else {
      setStatusMessage("Lesson created")
      setNewTitle("")
      setNewDescription("")
      setNewStage("")
      setNewGroundTopics("")
      setNewFlightManeuvers("")
      setNewCompletionStandards("")
      await fetchLessons(selectedCourseId)
    }

    setSavingCreate(false)
  }

  const handleUpdate = async (lessonId: string) => {
    if (!editTitle.trim()) return

    setSavingUpdate(true)
    setStatusMessage("")

    const { error } = await supabase
      .from("syllabus_lessons")
      .update({
        lesson_number: editLessonNumber,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        stage: editStage || null,
        ground_topics: editGroundTopics.split("\n").filter(Boolean).map((s) => s.trim()),
        flight_maneuvers: editFlightManeuvers.split("\n").filter(Boolean).map((s) => s.trim()),
        completion_standards: editCompletionStandards.trim() || null,
        order_index: editOrderIndex,
      })
      .eq("id", lessonId)

    if (error) {
      setStatusMessage(`Failed to update lesson: ${error.message}`)
    } else {
      setStatusMessage("Lesson updated")
      setEditingId(null)
      await fetchLessons(selectedCourseId)
    }

    setSavingUpdate(false)
  }

  const handleDelete = async (lessonId: string) => {
    if (!confirm("Delete this syllabus lesson?")) return

    const { error } = await supabase.from("syllabus_lessons").delete().eq("id", lessonId)
    if (error) {
      setStatusMessage(`Failed to delete lesson: ${error.message}`)
      return
    }

    setStatusMessage("Lesson deleted")
    await fetchLessons(selectedCourseId)
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const current = lessons[index]
    const above = lessons[index - 1]

    const [r1, r2] = await Promise.all([
      supabase.from("syllabus_lessons").update({ order_index: above.order_index }).eq("id", current.id),
      supabase.from("syllabus_lessons").update({ order_index: current.order_index }).eq("id", above.id),
    ])

    if (r1.error || r2.error) {
      setStatusMessage("Failed to reorder lessons")
      return
    }

    await fetchLessons(selectedCourseId)
  }

  const handleMoveDown = async (index: number) => {
    if (index === lessons.length - 1) return
    const current = lessons[index]
    const below = lessons[index + 1]

    const [r1, r2] = await Promise.all([
      supabase.from("syllabus_lessons").update({ order_index: below.order_index }).eq("id", current.id),
      supabase.from("syllabus_lessons").update({ order_index: current.order_index }).eq("id", below.id),
    ])

    if (r1.error || r2.error) {
      setStatusMessage("Failed to reorder lessons")
      return
    }

    await fetchLessons(selectedCourseId)
  }

  const startEditing = (lesson: SyllabusLesson) => {
    setEditingId(lesson.id)
    setEditLessonNumber(lesson.lesson_number)
    setEditTitle(lesson.title)
    setEditDescription(lesson.description || "")
    setEditStage(lesson.stage || "")
    setEditGroundTopics((lesson.ground_topics || []).join("\n"))
    setEditFlightManeuvers((lesson.flight_maneuvers || []).join("\n"))
    setEditCompletionStandards(lesson.completion_standards || "")
    setEditOrderIndex(lesson.order_index)
  }

  const renderStageBadge = (stage: string | null) => {
    if (!stage) return null
    const colors = STAGE_COLORS[stage] || { bg: "#F3F4F6", text: "#374151" }
    return (
      <span
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        {stage}
      </span>
    )
  }

  return (
    <AdminPageShell
      title="Manage Syllabus Lessons"
      description="Create and organize detailed lesson plans for each course."
    >
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Course Selector */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: "#374151" }}>
              Select Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                width: "100%",
                maxWidth: "400px",
                fontSize: "14px",
              }}
            >
              <option value="">— Choose a course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {selectedCourseId && (
            <>
              {/* Create Form */}
              <div
                style={{
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "24px",
                }}
              >
                <h4 style={{ marginTop: 0, marginBottom: "16px" }}>Add New Lesson</h4>
                <form onSubmit={handleCreate} style={{ display: "grid", gap: "10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Lesson Number</label>
                      <input
                        type="number"
                        value={newLessonNumber}
                        onChange={(e) => setNewLessonNumber(Number(e.target.value))}
                        min={1}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Order Index</label>
                      <input
                        type="number"
                        value={newOrderIndex}
                        onChange={(e) => setNewOrderIndex(Number(e.target.value))}
                        min={0}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Title</label>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Introduction to Slow Flight"
                      required
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Stage</label>
                    <select
                      value={newStage}
                      onChange={(e) => setNewStage(e.target.value)}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                    >
                      <option value="">— None —</option>
                      {STAGE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Description</label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Lesson description (optional)"
                      rows={2}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Ground Topics (one per line)</label>
                    <textarea
                      value={newGroundTopics}
                      onChange={(e) => setNewGroundTopics(e.target.value)}
                      placeholder={"Aerodynamics of slow flight\nPower settings\nStall awareness"}
                      rows={3}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Flight Maneuvers (one per line)</label>
                    <textarea
                      value={newFlightManeuvers}
                      onChange={(e) => setNewFlightManeuvers(e.target.value)}
                      placeholder={"Slow flight\nPower-off stalls\nPower-on stalls"}
                      rows={3}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Completion Standards</label>
                    <textarea
                      value={newCompletionStandards}
                      onChange={(e) => setNewCompletionStandards(e.target.value)}
                      placeholder="Student can maintain altitude ±100ft in slow flight configuration..."
                      rows={2}
                      style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingCreate}
                    style={{
                      background: "#C59A2A",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 16px",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "fit-content",
                      opacity: savingCreate ? 0.7 : 1,
                    }}
                  >
                    {savingCreate ? "Saving..." : "Add Lesson"}
                  </button>
                </form>
              </div>

              {/* Lesson List */}
              {loadingLessons ? (
                <p>Loading lessons...</p>
              ) : lessons.length === 0 ? (
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
                  <p>No syllabus lessons yet. Add one above to get started.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      style={{
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        padding: "16px",
                        backgroundColor: "white",
                      }}
                    >
                      {editingId === lesson.id ? (
                        /* Inline Edit Form */
                        <div style={{ display: "grid", gap: "10px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Lesson Number</label>
                              <input
                                type="number"
                                value={editLessonNumber}
                                onChange={(e) => setEditLessonNumber(Number(e.target.value))}
                                min={1}
                                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB", width: "100%" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Order Index</label>
                              <input
                                type="number"
                                value={editOrderIndex}
                                onChange={(e) => setEditOrderIndex(Number(e.target.value))}
                                min={0}
                                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB", width: "100%" }}
                              />
                            </div>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Title</label>
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB", width: "100%" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Stage</label>
                            <select
                              value={editStage}
                              onChange={(e) => setEditStage(e.target.value)}
                              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB", width: "100%" }}
                            >
                              <option value="">— None —</option>
                              {STAGE_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Description</label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={2}
                              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB", width: "100%" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Ground Topics (one per line)</label>
                            <textarea
                              value={editGroundTopics}
                              onChange={(e) => setEditGroundTopics(e.target.value)}
                              rows={3}
                              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB", width: "100%" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Flight Maneuvers (one per line)</label>
                            <textarea
                              value={editFlightManeuvers}
                              onChange={(e) => setEditFlightManeuvers(e.target.value)}
                              rows={3}
                              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB", width: "100%" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "13px", color: "#374151", marginBottom: "4px" }}>Completion Standards</label>
                            <textarea
                              value={editCompletionStandards}
                              onChange={(e) => setEditCompletionStandards(e.target.value)}
                              rows={2}
                              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #D1D5DB", width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              disabled={savingUpdate}
                              onClick={() => void handleUpdate(lesson.id)}
                              style={{ background: "#10B981", color: "white", border: "none", borderRadius: "6px", padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}
                            >
                              {savingUpdate ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              style={{ background: "#6B7280", color: "white", border: "none", borderRadius: "6px", padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: "15px" }}>
                                  {lesson.lesson_number}. {lesson.title}
                                </p>
                                {renderStageBadge(lesson.stage)}
                              </div>
                              {lesson.description && (
                                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6B7280" }}>
                                  {lesson.description.length > 120
                                    ? `${lesson.description.substring(0, 120)}...`
                                    : lesson.description}
                                </p>
                              )}
                              {lesson.ground_topics.length > 0 && (
                                <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#9CA3AF" }}>
                                  <strong>Ground:</strong> {lesson.ground_topics.join(", ")}
                                </p>
                              )}
                              {lesson.flight_maneuvers.length > 0 && (
                                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#9CA3AF" }}>
                                  <strong>Flight:</strong> {lesson.flight_maneuvers.join(", ")}
                                </p>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => void handleMoveUp(idx)}
                                disabled={idx === 0}
                                style={{
                                  background: idx === 0 ? "#E5E7EB" : "#111827",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "6px 10px",
                                  cursor: idx === 0 ? "default" : "pointer",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleMoveDown(idx)}
                                disabled={idx === lessons.length - 1}
                                style={{
                                  background: idx === lessons.length - 1 ? "#E5E7EB" : "#111827",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "6px 10px",
                                  cursor: idx === lessons.length - 1 ? "default" : "pointer",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditing(lesson)}
                                style={{ background: "#3B82F6", color: "white", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(lesson.id)}
                                style={{ background: "#EF4444", color: "white", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {statusMessage && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px",
                    borderRadius: "6px",
                    backgroundColor: statusMessage.startsWith("Failed") ? "#FEF2F2" : "#F0FDF4",
                    border: statusMessage.startsWith("Failed") ? "1px solid #FECACA" : "1px solid #DCFCE7",
                    color: statusMessage.startsWith("Failed") ? "#991B1B" : "#166534",
                    fontSize: "14px",
                  }}
                >
                  {statusMessage}
                </div>
              )}
            </>
          )}
        </>
      )}
    </AdminPageShell>
  )
}
