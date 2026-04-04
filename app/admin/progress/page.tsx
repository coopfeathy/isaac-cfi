"use client"

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import AdminPageShell from "@/app/components/AdminPageShell"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type Course = {
  id: string
  title: string
}

type Lesson = {
  id: string
  title: string
}

type StudentOption = {
  id: string
  email: string | null
  full_name: string | null
}

type SyllabusItem = {
  id: string
  title: string
  description: string | null
  stage: string | null
  order_index: number
}

type ProgressRow = {
  syllabus_item_id: string
  status: SyllabusStatus
  instructor_notes: string | null
}

type SyllabusStatus = "not_started" | "introduced" | "practiced" | "proficient" | "needs_work"
type EditableSyllabusStatus = "proficient" | "needs_work"

type ItemDraft = {
  status: EditableSyllabusStatus
  instructorNotes: string
}

const STATUS_OPTIONS: EditableSyllabusStatus[] = [
  "proficient",
  "needs_work",
]

const toEditableStatus = (value: SyllabusStatus | null | undefined): EditableSyllabusStatus =>
  value === "proficient" ? "proficient" : "needs_work"

const normalizeCourseTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/course|training/g, "")
    .replace(/[^a-z0-9]/g, "")

const normalizeName = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""

const normalizeEmail = (value: string | null | undefined) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const isEmailLikeValue = (value: string | null | undefined) => {
  const normalized = normalizeName(value).toLowerCase()
  if (!normalized) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

const deriveNameFromEmail = (email: string | null | undefined) => {
  const normalized = normalizeEmail(email)
  if (!normalized) return "Student"
  const localPart = normalized.split("@")[0] || ""
  const words = localPart
    .replace(/[^a-z0-9._-]/gi, "")
    .split(/[._-]+/)
    .filter(Boolean)

  if (words.length === 0) return "Student"

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const getLineBounds = (text: string, cursor: number) => {
  const lineStart = text.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1
  const nextNewline = text.indexOf("\n", cursor)
  const lineEnd = nextNewline === -1 ? text.length : nextNewline
  return { lineStart, lineEnd }
}

export default function AdminProgressPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")

  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([])
  const [itemDrafts, setItemDrafts] = useState<Record<string, ItemDraft>>({})
  const [focusedSyllabusItemId, setFocusedSyllabusItemId] = useState("")

  const [selectedLessonId, setSelectedLessonId] = useState("")
  const [performanceRating, setPerformanceRating] = useState(3)
  const [debriefPositiveObservations, setDebriefPositiveObservations] = useState("")
  const [debriefNegativeObservations, setDebriefNegativeObservations] = useState("")
  const [debriefRecommendedStudyPractice, setDebriefRecommendedStudyPractice] = useState("")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")
  const [markCompletePulse, setMarkCompletePulse] = useState(false)
  const [justCompletedItemId, setJustCompletedItemId] = useState("")
  const [linkedSourceCourseIds, setLinkedSourceCourseIds] = useState<string[]>([])
  const [migratingEnrollments, setMigratingEnrollments] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [debriefImages, setDebriefImages] = useState<File[]>([])
  const [debriefImagePreviews, setDebriefImagePreviews] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const [showSyllabusManager, setShowSyllabusManager] = useState(false)
  const [syllabusManagerItems, setSyllabusManagerItems] = useState<SyllabusItem[]>([])
  const [syllabusManagerLoading, setSyllabusManagerLoading] = useState(false)
  const [syllabusManagerStatus, setSyllabusManagerStatus] = useState("")
  const [syllabusNewTitle, setSyllabusNewTitle] = useState("")
  const [syllabusNewDescription, setSyllabusNewDescription] = useState("")
  const [syllabusNewStage, setSyllabusNewStage] = useState("")
  const [syllabusEditingId, setSyllabusEditingId] = useState<string | null>(null)
  const [syllabusEditTitle, setSyllabusEditTitle] = useState("")
  const [syllabusEditDescription, setSyllabusEditDescription] = useState("")
  const [syllabusEditStage, setSyllabusEditStage] = useState("")
  const [syllabusSaving, setSyllabusSaving] = useState(false)
  const [syllabusDeleting, setSyllabusDeleting] = useState<string | null>(null)

  const findNextOpenItemId = (drafts: Record<string, ItemDraft>) => {
    const next = syllabusItems.find((item) => (drafts[item.id]?.status || "not_started") !== "proficient")
    return next?.id || ""
  }

  const handleSmartListKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    value: string,
    setValue: Dispatch<SetStateAction<string>>
  ) => {
    const element = event.currentTarget
    const selectionStart = element.selectionStart
    const selectionEnd = element.selectionEnd
    const hasRangeSelection = selectionStart !== selectionEnd

    if (hasRangeSelection) return

    if (event.key === " ") {
      const { lineStart } = getLineBounds(value, selectionStart)
      const prefix = value.slice(lineStart, selectionStart)

      if (/^(\*|-)$/i.test(prefix)) {
        event.preventDefault()
        const nextValue = `${value.slice(0, lineStart)}• ${value.slice(selectionStart)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          element.selectionStart = lineStart + 2
          element.selectionEnd = lineStart + 2
        })
        return
      }

      if (/^\d+\.$/.test(prefix)) {
        event.preventDefault()
        const normalized = `${prefix} `
        const nextValue = `${value.slice(0, lineStart)}${normalized}${value.slice(selectionStart)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          element.selectionStart = lineStart + normalized.length
          element.selectionEnd = lineStart + normalized.length
        })
      }
      return
    }

    if (event.key === "Enter") {
      const { lineStart, lineEnd } = getLineBounds(value, selectionStart)
      const lineText = value.slice(lineStart, lineEnd)

      if (/^•\s$/.test(lineText) || /^\d+\.\s$/.test(lineText)) {
        event.preventDefault()
        const nextValue = `${value.slice(0, lineStart)}${value.slice(lineEnd)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          element.selectionStart = lineStart
          element.selectionEnd = lineStart
        })
        return
      }

      if (/^•\s/.test(lineText)) {
        event.preventDefault()
        const insertion = "\n• "
        const nextValue = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionStart)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          const nextCursor = selectionStart + insertion.length
          element.selectionStart = nextCursor
          element.selectionEnd = nextCursor
        })
        return
      }

      const orderedMatch = lineText.match(/^(\d+)\.\s/)
      if (orderedMatch) {
        event.preventDefault()
        const nextNumber = Number(orderedMatch[1]) + 1
        const insertion = `\n${nextNumber}. `
        const nextValue = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionStart)}`
        setValue(nextValue)
        requestAnimationFrame(() => {
          const nextCursor = selectionStart + insertion.length
          element.selectionStart = nextCursor
          element.selectionEnd = nextCursor
        })
      }
    }
  }

  const focusSyllabusItem = (itemId: string) => {
    setFocusedSyllabusItemId(itemId)
    requestAnimationFrame(() => {
      const element = document.getElementById(`syllabus-item-${itemId}`)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    })
  }

  const handleAttachImages = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    const maxSize = 10 * 1024 * 1024 // 10 MB
    const newFiles: File[] = []
    const newPreviews: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!allowed.includes(file.type)) continue
      if (file.size > maxSize) continue
      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }
    setDebriefImages((prev) => [...prev, ...newFiles])
    setDebriefImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const removeDebriefImage = (index: number) => {
    setDebriefImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    setDebriefImages((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadDebriefImages = async (): Promise<string[]> => {
    if (debriefImages.length === 0) return []
    setUploadingImages(true)
    const urls: string[] = []
    try {
      for (const file of debriefImages) {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const storagePath = `${selectedStudentId}/${timestamp}-${safeName}`
        const { error: uploadError } = await supabase.storage
          .from("debrief-images")
          .upload(storagePath, file, { upsert: false, cacheControl: "3600" })
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`)
        const { data } = supabase.storage.from("debrief-images").getPublicUrl(storagePath)
        urls.push(data.publicUrl)
      }
    } finally {
      setUploadingImages(false)
    }
    return urls
  }

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin) {
      router.push("/login")
      return
    }

    const fetchCourses = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("title")

      if (!error) {
        setCourses(data || [])
        if (data && data.length > 0) {
          setSelectedCourse(data[0].id)
        }
      }
      setLoading(false)
    }

    fetchCourses()
  }, [authLoading, isAdmin, router])

  useEffect(() => {
    if (!selectedCourse) return

    const fetchCourseData = async () => {
      setStatusMessage("")
      setLinkedSourceCourseIds([])
      const [itemsResult, lessonsResult, enrollmentsResult] = await Promise.all([
        supabase
          .from("syllabus_items")
          .select("id, title, description, stage, order_index")
          .eq("course_id", selectedCourse)
          .order("order_index", { ascending: true }),
        supabase
          .from("lessons")
          .select("id, title, unit_id, units!inner(course_id)")
          .eq("units.course_id", selectedCourse)
          .order("title", { ascending: true }),
        supabase
          .from("enrollments")
          .select("student_id")
          .eq("course_id", selectedCourse),
      ])

      const items = (itemsResult.data as SyllabusItem[] | null) || []
      setSyllabusItems(items)
      setFocusedSyllabusItemId((current) => (current && items.some((item) => item.id === current) ? current : items[0]?.id || ""))

      const lessonRows = (lessonsResult.data as any[] | null) || []
      setLessons(
        lessonRows.map((row) => ({
          id: row.id,
          title: row.title,
        }))
      )

      let enrollmentRows = (enrollmentsResult.data as { student_id: string }[] | null) || []

      if (enrollmentRows.length === 0) {
        const selectedCourseRecord = courses.find((course) => course.id === selectedCourse)
        const normalizedSelected = selectedCourseRecord ? normalizeCourseTitle(selectedCourseRecord.title) : null
        const relatedCourseIds = normalizedSelected
          ? courses
              .filter((course) => course.id !== selectedCourse && normalizeCourseTitle(course.title) === normalizedSelected)
              .map((course) => course.id)
          : []

        if (relatedCourseIds.length > 0) {
          const { data: relatedEnrollmentData } = await supabase
            .from("enrollments")
            .select("student_id")
            .in("course_id", relatedCourseIds)

          const relatedEnrollmentRows = (relatedEnrollmentData as { student_id: string }[] | null) || []
          if (relatedEnrollmentRows.length > 0) {
            enrollmentRows = relatedEnrollmentRows
            setLinkedSourceCourseIds(relatedCourseIds)
            setStatusMessage("No enrollments on this course record yet. Showing students from a linked course record with the same name.")
          }
        }
      }

      const studentIds = Array.from(new Set(enrollmentRows.map((entry) => entry.student_id).filter(Boolean)))

      if (studentIds.length === 0) {
        setStudents([])
        setSelectedStudentId("")
        return
      }

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds)

      const profileNameById = new Map(
        ((profileRows as Array<{ id: string; full_name: string | null }> | null) || []).map((row) => [row.id, row.full_name])
      )

      // Fetch students from students table instead of auth users for better name reliability
      let { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("user_id, email, full_name")
        .in("user_id", studentIds)
        .not("user_id", "is", null)
        .order("full_name", { ascending: true })

      if (studentsError) {
        setStatusMessage("Unable to load enrolled students")
        return
      }

      let students_list: StudentOption[] =
        (studentsData || [])
          .filter((row: any) => Boolean(row.user_id))
          .map((row: any) => ({
            id: row.user_id as string,
            email: row.email || null,
            full_name: (() => {
              const profileName = profileNameById.get(row.user_id as string) || null
              const studentName = normalizeName(row.full_name)
              const preferredName = !isEmailLikeValue(studentName)
                ? studentName
                : !isEmailLikeValue(profileName)
                ? normalizeName(profileName)
                : ""

              if (preferredName) return preferredName
              return deriveNameFromEmail(row.email)
            })(),
          }))

      const loadedIds = new Set(students_list.map((student) => student.id))
      let missingStudentIds = studentIds.filter((id) => !loadedIds.has(id))

      if (missingStudentIds.length > 0) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          await fetch("/api/admin/students/sync", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })

          const syncResult = await supabase
            .from("students")
            .select("user_id, email, full_name")
            .in("user_id", studentIds)
            .not("user_id", "is", null)
            .order("full_name", { ascending: true })

          if (!syncResult.error) {
            students_list =
              (syncResult.data || [])
                .filter((row: any) => Boolean(row.user_id))
                .map((row: any) => ({
                  id: row.user_id as string,
                  email: row.email || null,
                  full_name: (() => {
                    const profileName = profileNameById.get(row.user_id as string) || null
                    const studentName = normalizeName(row.full_name)
                    const preferredName = !isEmailLikeValue(studentName)
                      ? studentName
                      : !isEmailLikeValue(profileName)
                      ? normalizeName(profileName)
                      : ""

                    if (preferredName) return preferredName
                    return deriveNameFromEmail(row.email)
                  })(),
                }))
          }
        }

        const loadedAfterSync = new Set(students_list.map((student) => student.id))
        missingStudentIds = studentIds.filter((id) => !loadedAfterSync.has(id))

        if (missingStudentIds.length > 0) {
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", missingStudentIds)

          const profileById = new Map(
            ((profileRows as Array<{ id: string; full_name: string | null }> | null) || []).map((row) => [row.id, row.full_name])
          )

          const profileFallbacks: StudentOption[] = missingStudentIds.map((id) => ({
            id,
            email: null,
            full_name: profileById.get(id) || `Student (${id.slice(0, 8)})`,
          }))

          students_list = [...students_list, ...profileFallbacks]
          setStatusMessage("Some enrolled students were missing from the student registry. Fallback records are shown; run Normalize Student Records in Admin Enrollments to repair duplicate and incomplete student records.")
        }
      }

      students_list.sort((left, right) => {
        const leftName = (left.full_name || left.email || "").toLowerCase()
        const rightName = (right.full_name || right.email || "").toLowerCase()
        return leftName.localeCompare(rightName)
      })

      setStudents(students_list)
      if (!students_list.find((u) => u.id === selectedStudentId)) {
        setSelectedStudentId(students_list[0]?.id || "")
      }
    }

    fetchCourseData()
  }, [selectedCourse, selectedStudentId, reloadKey])

  const migrateLinkedEnrollments = async () => {
    if (!selectedCourse || linkedSourceCourseIds.length === 0) return

    setMigratingEnrollments(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("Missing admin session")
      }

      const response = await fetch("/api/admin/enrollments/migrate-course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          targetCourseId: selectedCourse,
          sourceCourseIds: linkedSourceCourseIds,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || "Unable to migrate enrollments")
      }

      setStatusMessage(`Enrollment migration complete. Inserted ${result.inserted || 0}, skipped ${result.skipped || 0}.`)
      setLinkedSourceCourseIds([])
      setReloadKey((previous) => previous + 1)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to migrate enrollments")
    } finally {
      setMigratingEnrollments(false)
    }
  }

  const openSyllabusManager = async () => {
    if (!selectedCourse) {
      setStatusMessage("Select a course first")
      return
    }
    setShowSyllabusManager(true)
    setSyllabusManagerStatus("")
    await loadSyllabusManagerItems()
  }

  const loadSyllabusManagerItems = async () => {
    setSyllabusManagerLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch(`/api/admin/syllabus-items?courseId=${selectedCourse}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to load syllabus items")
      setSyllabusManagerItems(result.items || [])
    } catch (error) {
      setSyllabusManagerStatus(error instanceof Error ? error.message : "Unable to load syllabus items")
    } finally {
      setSyllabusManagerLoading(false)
    }
  }

  const createSyllabusItem = async () => {
    if (!syllabusNewTitle.trim()) {
      setSyllabusManagerStatus("Title is required")
      return
    }
    setSyllabusSaving(true)
    setSyllabusManagerStatus("")
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch("/api/admin/syllabus-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          courseId: selectedCourse,
          title: syllabusNewTitle,
          description: syllabusNewDescription || null,
          stage: syllabusNewStage || null,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to create syllabus item")

      setSyllabusNewTitle("")
      setSyllabusNewDescription("")
      setSyllabusNewStage("")
      setSyllabusManagerStatus("Syllabus item created")
      await loadSyllabusManagerItems()
    } catch (error) {
      setSyllabusManagerStatus(error instanceof Error ? error.message : "Unable to create syllabus item")
    } finally {
      setSyllabusSaving(false)
    }
  }

  const startEditSyllabusItem = (item: SyllabusItem) => {
    setSyllabusEditingId(item.id)
    setSyllabusEditTitle(item.title)
    setSyllabusEditDescription(item.description || "")
    setSyllabusEditStage(item.stage || "")
    setSyllabusManagerStatus("")
  }

  const cancelEditSyllabusItem = () => {
    setSyllabusEditingId(null)
    setSyllabusEditTitle("")
    setSyllabusEditDescription("")
    setSyllabusEditStage("")
  }

  const saveEditSyllabusItem = async () => {
    if (!syllabusEditingId || !syllabusEditTitle.trim()) {
      setSyllabusManagerStatus("Title is required")
      return
    }
    setSyllabusSaving(true)
    setSyllabusManagerStatus("")
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch("/api/admin/syllabus-items", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: syllabusEditingId,
          title: syllabusEditTitle,
          description: syllabusEditDescription || null,
          stage: syllabusEditStage || null,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to update syllabus item")

      cancelEditSyllabusItem()
      setSyllabusManagerStatus("Syllabus item updated")
      await loadSyllabusManagerItems()
    } catch (error) {
      setSyllabusManagerStatus(error instanceof Error ? error.message : "Unable to update syllabus item")
    } finally {
      setSyllabusSaving(false)
    }
  }

  const deleteSyllabusItem = async (itemId: string, itemTitle: string) => {
    if (!confirm(`Delete syllabus item "${itemTitle}"? This will also remove all student progress for this item.`)) return
    setSyllabusDeleting(itemId)
    setSyllabusManagerStatus("")
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Missing admin session")

      const response = await fetch("/api/admin/syllabus-items", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: itemId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to delete syllabus item")

      setSyllabusManagerStatus("Syllabus item deleted")
      await loadSyllabusManagerItems()
    } catch (error) {
      setSyllabusManagerStatus(error instanceof Error ? error.message : "Unable to delete syllabus item")
    } finally {
      setSyllabusDeleting(null)
    }
  }

  const closeSyllabusManager = () => {
    setShowSyllabusManager(false)
    cancelEditSyllabusItem()
    setSyllabusManagerStatus("")
    setReloadKey((previous) => previous + 1)
  }

  const moveSyllabusItem = async (itemId: string, direction: "up" | "down") => {
    const idx = syllabusManagerItems.findIndex((item) => item.id === itemId)
    if (idx < 0) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= syllabusManagerItems.length) return

    const currentItem = syllabusManagerItems[idx]
    const swapItem = syllabusManagerItems[swapIdx]

    setSyllabusSaving(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Missing admin session")

      await Promise.all([
        fetch("/api/admin/syllabus-items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ id: currentItem.id, order_index: swapItem.order_index }),
        }),
        fetch("/api/admin/syllabus-items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ id: swapItem.id, order_index: currentItem.order_index }),
        }),
      ])
      await loadSyllabusManagerItems()
    } catch {
      setSyllabusManagerStatus("Unable to reorder items")
    } finally {
      setSyllabusSaving(false)
    }
  }

  useEffect(() => {
    if (!selectedStudentId || syllabusItems.length === 0) {
      setItemDrafts({})
      return
    }

    const fetchProgress = async () => {
      const { data } = await supabase
        .from("student_syllabus_progress")
        .select("syllabus_item_id, status, instructor_notes")
        .eq("student_id", selectedStudentId)
        .in(
          "syllabus_item_id",
          syllabusItems.map((item) => item.id)
        )

      const progressRows = (data as ProgressRow[] | null) || []
      const lookup: Record<string, ProgressRow> = {}
      progressRows.forEach((row) => {
        lookup[row.syllabus_item_id] = row
      })

      const nextDrafts: Record<string, ItemDraft> = {}
      syllabusItems.forEach((item) => {
        const existing = lookup[item.id]
        nextDrafts[item.id] = {
          status: toEditableStatus(existing?.status),
          instructorNotes: existing?.instructor_notes || "",
        }
      })

      setItemDrafts(nextDrafts)
      setFocusedSyllabusItemId((current) => {
        if (current && syllabusItems.some((item) => item.id === current)) return current
        return findNextOpenItemId(nextDrafts) || syllabusItems[0]?.id || ""
      })
    }

    fetchProgress()
  }, [selectedStudentId, syllabusItems])

  const handleMarkFocusedComplete = () => {
    if (!focusedSyllabusItemId) return

    const completedItemId = focusedSyllabusItemId
    const nextStatus = itemDrafts[completedItemId]?.status === "proficient" ? "needs_work" : "proficient"
    setMarkCompletePulse(true)
    setJustCompletedItemId(nextStatus === "proficient" ? completedItemId : "")
    setTimeout(() => setMarkCompletePulse(false), 220)
    if (nextStatus === "proficient") {
      setTimeout(() => setJustCompletedItemId((current) => (current === completedItemId ? "" : current)), 1600)
    }

    setItemDrafts((previous) => {
      const nextDrafts: Record<string, ItemDraft> = {
        ...previous,
        [completedItemId]: {
          ...(previous[completedItemId] || {
            status: "needs_work",
            instructorNotes: "",
          }),
          status: nextStatus,
        },
      }

      if (nextStatus === "proficient") {
        const currentIndex = syllabusItems.findIndex((item) => item.id === completedItemId)
        const nextItem = syllabusItems
          .slice(currentIndex + 1)
          .find((item) => (nextDrafts[item.id]?.status || "needs_work") !== "proficient")

        if (nextItem) {
          setFocusedSyllabusItemId(nextItem.id)
        }
      }

      return nextDrafts
    })
  }

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [students, selectedStudentId]
  )

  const handleSubmitEvaluation = async (sendEvaluationEmail: boolean) => {

    if (!selectedCourse || !selectedStudentId || syllabusItems.length === 0 || !focusedSyllabusItemId) {
      setStatusMessage("Select a course, student, and syllabus items first")
      return
    }

    const nextDrafts: Record<string, ItemDraft> = { ...itemDrafts }
    const focusedDraft = nextDrafts[focusedSyllabusItemId] || {
      status: "needs_work" as EditableSyllabusStatus,
      instructorNotes: "",
    }
    const focusedSyllabusItem = syllabusItems.find((item) => item.id === focusedSyllabusItemId) || null

    const syllabusUpdates = [
      {
        syllabusItemId: focusedSyllabusItemId,
        status: focusedDraft.status,
        instructorNotes: focusedDraft.instructorNotes || null,
      },
    ]

    setSubmitting(true)
    setStatusMessage("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setStatusMessage("Missing session. Please sign in again.")
      setSubmitting(false)
      return
    }

    let imageUrls: string[] = []
    if (debriefImages.length > 0) {
      try {
        imageUrls = await uploadDebriefImages()
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Image upload failed")
        setSubmitting(false)
        return
      }
    }

    const response = await fetch("/api/admin/lesson-evaluations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        courseId: selectedCourse,
        studentId: selectedStudentId,
        lessonId: selectedLessonId || null,
        syllabusItemTitle: focusedSyllabusItem?.title || null,
        performanceRating,
        debrief: {
          positiveObservations: debriefPositiveObservations,
          negativeObservations: debriefNegativeObservations,
          recommendedStudyPractice: debriefRecommendedStudyPractice,
        },
        syllabusUpdates,
        sendEmail: sendEvaluationEmail,
        imageUrls,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      setStatusMessage(`Failed to save evaluation: ${result.error || "Unknown error"}`)
      setSubmitting(false)
      return
    }

    const statusParts: string[] = [sendEvaluationEmail ? "Lesson evaluation sent" : "Lesson evaluation saved for later"]

    if (result.emailSent) {
      statusParts.push("debrief email sent")
    } else if (sendEvaluationEmail && result.emailError) {
      statusParts.push(`debrief email failed: ${result.emailError}`)
    }

    if (result.homeworkEmailStatus === "queued_on_completion") {
      statusParts.push("homework email will queue when the student completes the lesson")
    } else if (result.homeworkEmailStatus === "pending") {
      statusParts.push(
        result.homeworkQueuedFor
          ? `homework email queued for ${new Date(result.homeworkQueuedFor).toLocaleString()}`
          : "homework email queued"
      )
    } else if (result.homeworkEmailStatus === "failed") {
      statusParts.push(`homework email failed: ${result.homeworkEmailError || "Unknown error"}`)
    }

    setStatusMessage(statusParts.join(" | "))

    setItemDrafts(nextDrafts)
    setFocusedSyllabusItemId(focusedDraft.status === "proficient" ? findNextOpenItemId(nextDrafts) : focusedSyllabusItemId)

    // Clear attached images after successful submission
    debriefImagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setDebriefImages([])
    setDebriefImagePreviews([])

    setSubmitting(false)
  }

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <AdminPageShell
      title="Lesson Evaluations & Student Debriefs"
      description="Capture lesson evaluations, track syllabus progress, and send students feedback on their training flights."
      maxWidthClassName="max-w-6xl"
    >

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "15px" }}
        >
          <option value="">Select course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          style={{ padding: "12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "15px" }}
        >
          <option value="">Select enrolled student</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name || student.email}
            </option>
          ))}
        </select>
      </div>

      {linkedSourceCourseIds.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            background: "#FFFBEB",
            border: "1px solid #FCD34D",
            borderRadius: "10px",
            padding: "12px 14px",
            display: "grid",
            gap: "8px",
          }}
        >
          <p style={{ margin: 0, color: "#92400E", fontSize: "14px" }}>
            Students are currently loaded from linked course records with similar names. Migrate those enrollments into this selected course to permanently fix debrief visibility.
          </p>
          <button
            type="button"
            onClick={() => void migrateLinkedEnrollments()}
            disabled={migratingEnrollments}
            style={{
              justifySelf: "start",
              background: "#92400E",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "10px 14px",
              fontWeight: 600,
              cursor: "pointer",
              opacity: migratingEnrollments ? 0.7 : 1,
            }}
          >
            {migratingEnrollments ? "Migrating Enrollments..." : "Migrate Linked Enrollments to This Course"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
        <section style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "20px" }}>
          <h2 style={{ marginTop: 0 }}>Lesson Evaluation</h2>
          <p style={{ marginTop: 0, color: "#6B7280", fontSize: "14px" }}>
            Student: {selectedStudent ? selectedStudent.full_name || selectedStudent.email : "Select a student"}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSubmitEvaluation(true)
            }}
            style={{ display: "grid", gap: "14px" }}
          >
            <div style={{ display: "grid", gap: "10px", fontSize: "14px" }}>
              <label style={{ fontWeight: 600 }}>Event Performance Grade</label>
              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  { value: 4, label: "Above Average", arrows: "⬆️⬆️", description: "Consistently meeting or exceeding standards" },
                  { value: 3, label: "Slightly Above Average", arrows: "⬆️", description: "Meeting most expectations" },
                  { value: 2, label: "Slightly Below Average", arrows: "⬇️", description: "Uncertain if they will meet standards" },
                  { value: 1, label: "Below Average", arrows: "⬇️⬇️", description: "Unlikely to meet standards" },
                ].map((grade) => (
                  <label key={grade.value} style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", padding: "10px", borderRadius: "8px", border: performanceRating === grade.value ? "2px solid #C59A2A" : "1px solid #E5E7EB", background: performanceRating === grade.value ? "#FFFBEB" : "#F9FAFB" }}>
                    <input
                      type="radio"
                      name="performance-grade"
                      value={grade.value}
                      checked={performanceRating === grade.value}
                      onChange={(e) => setPerformanceRating(Number(e.target.value))}
                      style={{ marginTop: "4px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                        {grade.arrows} {grade.label}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6B7280" }}>{grade.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: "8px", padding: "10px", borderRadius: "8px", border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ fontSize: "14px", fontWeight: 600 }}>Debriefed Syllabus Item</label>
                <button
                  type="button"
                  onClick={() => void openSyllabusManager()}
                  style={{
                    background: "#F3F4F6",
                    color: "#374151",
                    border: "1px solid #D1D5DB",
                    borderRadius: "6px",
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Manage Syllabus Items
                </button>
              </div>
              {focusedSyllabusItemId && syllabusItems.find((item) => item.id === focusedSyllabusItemId) && (
                <div style={{ padding: "8px 12px", borderRadius: "8px", background: "#FFFBEB", border: "1px solid #C59A2A", fontSize: "14px", fontWeight: 500 }}>
                  {syllabusItems.find((item) => item.id === focusedSyllabusItemId)?.title} — {(itemDrafts[focusedSyllabusItemId]?.status || "needs_work").replace(/_/g, " ")}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                <select
                  value={focusedSyllabusItemId}
                  onChange={(e) => focusSyllabusItem(e.target.value)}
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
                >
                  <option value="">Select syllabus item</option>
                  {syllabusItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({(itemDrafts[item.id]?.status || "needs_work").replace(/_/g, " ")})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleMarkFocusedComplete}
                  style={{
                    background: itemDrafts[focusedSyllabusItemId]?.status === "proficient" ? "#F3F4F6" : "#10B981",
                    color: itemDrafts[focusedSyllabusItemId]?.status === "proficient" ? "#111827" : "white",
                    border: itemDrafts[focusedSyllabusItemId]?.status === "proficient" ? "1px solid #D1D5DB" : "none",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transform: markCompletePulse ? "translateY(1px) scale(0.97)" : "translateY(0) scale(1)",
                    boxShadow: markCompletePulse ? "inset 0 2px 8px rgba(0,0,0,0.18)" : "0 2px 6px rgba(16, 185, 129, 0.25)",
                    transition: "transform 180ms ease, box-shadow 180ms ease",
                  }}
                >
                  {markCompletePulse ? "Updated" : itemDrafts[focusedSyllabusItemId]?.status === "proficient" ? "Mark Incomplete" : "Mark Complete"}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                Only the active syllabus item below is updated when you save or send this lesson evaluation.
              </p>
            </div>

            {syllabusItems.map((item) => (
              <div key={item.id} id={`syllabus-item-${item.id}`}>
                {(() => {
                  const itemStatus = itemDrafts[item.id]?.status || "needs_work"
                  const isProficient = itemStatus === "proficient"
                  const isFocused = focusedSyllabusItemId === item.id
                  const isJustCompleted = justCompletedItemId === item.id

                  return (
                    <div
                      onClick={() => setFocusedSyllabusItemId(item.id)}
                      style={{
                        border: isProficient
                          ? "2px solid #059669"
                          : isFocused
                          ? "2px solid #C59A2A"
                          : "1px solid #E5E7EB",
                        background: isProficient ? "#ECFDF5" : isFocused ? "#FFFBEB" : "#FFFFFF",
                        borderRadius: "10px",
                        padding: "12px",
                        boxShadow: isJustCompleted ? "0 0 0 3px rgba(16,185,129,0.25)" : "none",
                        transition: "background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{item.title}</p>
                        {isProficient && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              color: "#065F46",
                              background: "#D1FAE5",
                              border: "1px solid #6EE7B7",
                              borderRadius: "999px",
                              padding: "3px 8px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            COMPLETE
                          </span>
                        )}
                      </div>
                      {isFocused ? (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "10px" }}>
                            <select
                              value={itemDrafts[item.id]?.status || "needs_work"}
                              onChange={(e) =>
                                setItemDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: {
                                    ...(prev[item.id] || { status: "needs_work", instructorNotes: "" }),
                                    status: e.target.value as EditableSyllabusStatus,
                                  },
                                }))
                              }
                              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB" }}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status.replace(/_/g, " ")}
                                </option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            rows={3}
                            placeholder="Private instructor note for this syllabus item"
                            value={itemDrafts[item.id]?.instructorNotes || ""}
                            onChange={(e) =>
                              setItemDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || { status: "needs_work", instructorNotes: "" }),
                                  instructorNotes: e.target.value,
                                },
                              }))
                            }
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", width: "100%" }}
                          />
                          <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#6B7280" }}>
                            This syllabus note is private to instructors and is not shared with the student.
                          </p>
                        </>
                      ) : (
                        <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                          Click this item to make it the active debriefed syllabus item.
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>
            ))}


            <div style={{ display: "grid", gap: "10px", padding: "12px", borderRadius: "10px", border: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Debrief (shared with student)</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                Keep the student-facing lesson evaluation focused on what went well, what still needs work, and what to study next.
              </p>
              <textarea
                rows={3}
                value={debriefPositiveObservations}
                onChange={(e) => setDebriefPositiveObservations(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, debriefPositiveObservations, setDebriefPositiveObservations)}
                placeholder="Positive performance observations"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={3}
                value={debriefNegativeObservations}
                onChange={(e) => setDebriefNegativeObservations(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, debriefNegativeObservations, setDebriefNegativeObservations)}
                placeholder="Negative performance observations"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />
              <textarea
                rows={3}
                value={debriefRecommendedStudyPractice}
                onChange={(e) => setDebriefRecommendedStudyPractice(e.target.value)}
                onKeyDown={(e) => handleSmartListKeyDown(e, debriefRecommendedStudyPractice, setDebriefRecommendedStudyPractice)}
                placeholder="Recommended study and practice"
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #D1D5DB", background: "#fff" }}
              />

              {debriefImagePreviews.length > 0 && (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {debriefImagePreviews.map((src, idx) => (
                    <div key={idx} style={{ position: "relative", width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", border: "1px solid #D1D5DB" }}>
                      <img src={src} alt={`Attachment ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => removeDebriefImage(idx)}
                        style={{
                          position: "absolute",
                          top: "2px",
                          right: "2px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.6)",
                          color: "#fff",
                          border: "none",
                          fontSize: "12px",
                          lineHeight: "20px",
                          textAlign: "center",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <input
                  id="debrief-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={(e) => { handleAttachImages(e.target.files); e.target.value = "" }}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById("debrief-image-input")?.click()}
                  disabled={uploadingImages}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#fff",
                    color: "#374151",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📎</span> Attach Picture(s)
                  {debriefImages.length > 0 && (
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>({debriefImages.length})</span>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                Homework email behavior after lesson completion.
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                Email queueing is triggered when the student completes the lesson. Manual push/hold remains available in the Students workspace.
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={submitting || !selectedStudentId || syllabusItems.length === 0}
                  style={{
                    background: "#111827",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 18px",
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: submitting || !selectedStudentId || syllabusItems.length === 0 ? 0.65 : 1,
                  }}
                >
                  {submitting ? "Saving..." : "Send Lesson Evaluation"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitEvaluation(false)}
                  disabled={submitting || !selectedStudentId || syllabusItems.length === 0}
                  style={{
                    background: "#F3F4F6",
                    color: "#111827",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    padding: "12px 18px",
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: submitting || !selectedStudentId || syllabusItems.length === 0 ? 0.65 : 1,
                  }}
                >
                  {submitting ? "Saving..." : "Save for Later"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>

      {statusMessage && (
        <div
          style={{
            marginTop: "16px",
            background: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: "10px",
            padding: "12px 14px",
            color: "#374151",
          }}
        >
          {statusMessage}
        </div>
      )}

      {showSyllabusManager && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={closeSyllabusManager} />
          <div
            style={{
              position: "relative",
              zIndex: 10,
              width: "100%",
              maxWidth: "640px",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Manage Syllabus Items</h3>
              <button
                type="button"
                onClick={closeSyllabusManager}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6B7280", padding: "4px" }}
              >
                ✕
              </button>
            </div>

            {syllabusManagerStatus && (
              <div style={{ marginBottom: "12px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#374151" }}>
                {syllabusManagerStatus}
              </div>
            )}

            <div style={{ marginBottom: "16px", padding: "12px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "10px" }}>
              <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600, color: "#374151" }}>Add New Syllabus Item</p>
              <div style={{ display: "grid", gap: "8px" }}>
                <input
                  type="text"
                  value={syllabusNewTitle}
                  onChange={(e) => setSyllabusNewTitle(e.target.value)}
                  placeholder="Title (required)"
                  style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px" }}
                />
                <input
                  type="text"
                  value={syllabusNewDescription}
                  onChange={(e) => setSyllabusNewDescription(e.target.value)}
                  placeholder="Description (optional)"
                  style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px" }}
                />
                <input
                  type="text"
                  value={syllabusNewStage}
                  onChange={(e) => setSyllabusNewStage(e.target.value)}
                  placeholder="Stage (optional, e.g. Pre-Solo, Cross-Country)"
                  style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px" }}
                />
                <button
                  type="button"
                  onClick={() => void createSyllabusItem()}
                  disabled={syllabusSaving || !syllabusNewTitle.trim()}
                  style={{
                    background: "#111827",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: syllabusSaving || !syllabusNewTitle.trim() ? 0.6 : 1,
                  }}
                >
                  {syllabusSaving ? "Saving..." : "Add Item"}
                </button>
              </div>
            </div>

            {syllabusManagerLoading ? (
              <p style={{ fontSize: "13px", color: "#6B7280" }}>Loading syllabus items...</p>
            ) : syllabusManagerItems.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#6B7280" }}>No syllabus items for this course yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "8px" }}>
                {syllabusManagerItems.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: "10px",
                      padding: "12px",
                      background: syllabusEditingId === item.id ? "#FFFBEB" : "#fff",
                    }}
                  >
                    {syllabusEditingId === item.id ? (
                      <div style={{ display: "grid", gap: "8px" }}>
                        <input
                          type="text"
                          value={syllabusEditTitle}
                          onChange={(e) => setSyllabusEditTitle(e.target.value)}
                          placeholder="Title"
                          style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px" }}
                        />
                        <input
                          type="text"
                          value={syllabusEditDescription}
                          onChange={(e) => setSyllabusEditDescription(e.target.value)}
                          placeholder="Description"
                          style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px" }}
                        />
                        <input
                          type="text"
                          value={syllabusEditStage}
                          onChange={(e) => setSyllabusEditStage(e.target.value)}
                          placeholder="Stage"
                          style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #D1D5DB", fontSize: "13px" }}
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => void saveEditSyllabusItem()}
                            disabled={syllabusSaving || !syllabusEditTitle.trim()}
                            style={{
                              background: "#111827",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              opacity: syllabusSaving ? 0.6 : 1,
                            }}
                          >
                            {syllabusSaving ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditSyllabusItem}
                            style={{
                              background: "#F3F4F6",
                              color: "#374151",
                              border: "1px solid #D1D5DB",
                              borderRadius: "6px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>{item.title}</p>
                            {item.description && (
                              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6B7280" }}>{item.description}</p>
                            )}
                            {item.stage && (
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: "4px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#4338CA",
                                  background: "#EEF2FF",
                                  border: "1px solid #C7D2FE",
                                  borderRadius: "999px",
                                  padding: "2px 8px",
                                }}
                              >
                                {item.stage}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => void moveSyllabusItem(item.id, "up")}
                              disabled={idx === 0 || syllabusSaving}
                              title="Move up"
                              style={{
                                background: "none",
                                border: "1px solid #D1D5DB",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "12px",
                                cursor: idx === 0 ? "default" : "pointer",
                                opacity: idx === 0 ? 0.3 : 1,
                              }}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => void moveSyllabusItem(item.id, "down")}
                              disabled={idx === syllabusManagerItems.length - 1 || syllabusSaving}
                              title="Move down"
                              style={{
                                background: "none",
                                border: "1px solid #D1D5DB",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "12px",
                                cursor: idx === syllabusManagerItems.length - 1 ? "default" : "pointer",
                                opacity: idx === syllabusManagerItems.length - 1 ? 0.3 : 1,
                              }}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditSyllabusItem(item)}
                              style={{
                                background: "none",
                                border: "1px solid #D1D5DB",
                                borderRadius: "4px",
                                padding: "2px 8px",
                                fontSize: "12px",
                                cursor: "pointer",
                                color: "#374151",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteSyllabusItem(item.id, item.title)}
                              disabled={syllabusDeleting === item.id}
                              style={{
                                background: "none",
                                border: "1px solid #FCA5A5",
                                borderRadius: "4px",
                                padding: "2px 8px",
                                fontSize: "12px",
                                cursor: "pointer",
                                color: "#DC2626",
                                opacity: syllabusDeleting === item.id ? 0.5 : 1,
                              }}
                            >
                              {syllabusDeleting === item.id ? "..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
