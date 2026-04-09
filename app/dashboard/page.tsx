"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import LearningHubLayout from "@/app/components/LearningHubLayout"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

// ── Types ─────────────────────────────────────────────────────────────────────

type SlotData = {
  id: string
  start_time: string
  end_time: string
  type: "training" | "tour"
  description: string | null
}

type BookingWithSlotAndLesson = {
  id: string
  status: "pending" | "pending_approval" | "paid" | "confirmed" | "canceled" | "completed"
  syllabus_lesson_id: string | null
  slots: SlotData | null
}

type FullBooking = {
  id: string
  status: "pending" | "pending_approval" | "paid" | "confirmed" | "canceled" | "completed"
  created_at: string
  slots: SlotData | null
}

type SyllabusLessonData = {
  id: string
  lesson_number: number
  title: string
  description: string | null
  stage: string
  ground_topics: string[]
  flight_maneuvers: string[]
  completion_standards: string | null
}

type StudentHours = {
  total_hours: number | null
  solo_hours: number | null
  dual_hours: number | null
  pic_hours: number | null
  instrument_hours: number | null
  cross_country_hours: number | null
}

type Milestone = {
  id: string
  student_id: string
  completed_at: string | null
  [key: string]: unknown
}

type Endorsement = {
  id: string
  student_id: string
  instructor_id: string | null
  type: string
  issued_date: string | null
  expiration_date: string | null
  notes: string | null
}

type InvoiceData = {
  id: string
  amount_due: number
  currency: string
  description: string
  created: number
  due_date: number | null
  hosted_invoice_url: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const startOfWeekMonday = (value: Date) => {
  const date = new Date(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

const CANCELLABLE_STATUSES: FullBooking["status"][] = ["pending_approval", "confirmed", "paid"]

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "confirmed":
    case "paid":
      return "bg-green-100 text-green-800"
    case "pending_approval":
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "canceled":
      return "bg-gray-100 text-gray-700"
    case "completed":
      return "bg-blue-100 text-blue-800"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

const formatStatusLabel = (status: string) => {
  if (status === "pending_approval") return "Pending Approval"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()

  // --- Week schedule state (existing) ---
  const [bookings, setBookings] = useState<BookingWithSlotAndLesson[]>([])
  const [syllabusMap, setSyllabusMap] = useState<Record<string, SyllabusLessonData>>({})
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  // --- New self-service state ---
  const [allBookings, setAllBookings] = useState<FullBooking[]>([])
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentHours, setStudentHours] = useState<StudentHours | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [selfServiceLoading, setSelfServiceLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null)
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null)
  const [setupIntentLoading, setSetupIntentLoading] = useState(false)
  const [billingPortalLoading, setBillingPortalLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [cardSaved, setCardSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<"history" | "hours" | "endorsements" | "billing">(
    "history"
  )
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  // --- Week computation (existing) ---
  const weekStart = useMemo(() => {
    const base = startOfWeekMonday(new Date())
    return addDays(base, weekOffset * 7)
  }, [weekOffset])

  const weekEnd = useMemo(() => {
    const end = addDays(weekStart, 6)
    end.setHours(23, 59, 59, 999)
    return end
  }, [weekStart])

  // --- Fetch week schedule (existing logic, preserved) ---
  useEffect(() => {
    if (!user) return

    const fetchWeekData = async () => {
      setLoading(true)

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("id, status, syllabus_lesson_id, slots(id, start_time, end_time, type, description)")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "paid", "completed"])
        .gte("slots.start_time", weekStart.toISOString())
        .lte("slots.start_time", weekEnd.toISOString())
        .order("slots(start_time)", { ascending: true })

      if (bookingError) {
        console.error("Error fetching bookings:", bookingError)
        setLoading(false)
        return
      }

      const validBookings = (bookingData || [])
        .map((b: any) => ({
          ...b,
          slots: Array.isArray(b.slots) ? b.slots[0] ?? null : b.slots,
        }))
        .filter((b: any) => b.slots !== null) as BookingWithSlotAndLesson[]

      setBookings(validBookings)

      const lessonIds = validBookings
        .map((b) => b.syllabus_lesson_id)
        .filter((id): id is string => id !== null)

      if (lessonIds.length > 0) {
        const { data: lessons } = await supabase
          .from("syllabus_lessons")
          .select("id, lesson_number, title, description, stage, ground_topics, flight_maneuvers, completion_standards")
          .in("id", lessonIds)

        const map: Record<string, SyllabusLessonData> = {}
        for (const lesson of lessons || []) {
          map[lesson.id] = lesson as SyllabusLessonData
        }
        setSyllabusMap(map)
      } else {
        setSyllabusMap({})
      }

      setLoading(false)
    }

    void fetchWeekData()
  }, [user, weekStart, weekEnd])

  // --- Fetch self-service data ---
  useEffect(() => {
    if (!user) return

    const fetchSelfServiceData = async () => {
      setSelfServiceLoading(true)

      // All bookings (history)
      const { data: allBookingData } = await supabase
        .from("bookings")
        .select("id, status, created_at, slots(id, start_time, end_time, type, description)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      const normalizedBookings = (allBookingData || []).map((b: any) => ({
        ...b,
        slots: Array.isArray(b.slots) ? b.slots[0] ?? null : b.slots,
      })) as FullBooking[]
      setAllBookings(normalizedBookings)

      // Student record (hours + stripe customer)
      const { data: studentData } = await supabase
        .from("students")
        .select("id, total_hours, solo_hours, dual_hours, pic_hours, instrument_hours, cross_country_hours, stripe_customer_id")
        .eq("user_id", user.id)
        .single()

      if (studentData) {
        setStudentId(studentData.id)
        setStripeCustomerId(studentData.stripe_customer_id ?? null)
        setStudentHours({
          total_hours: studentData.total_hours,
          solo_hours: studentData.solo_hours,
          dual_hours: studentData.dual_hours,
          pic_hours: studentData.pic_hours,
          instrument_hours: studentData.instrument_hours,
          cross_country_hours: studentData.cross_country_hours,
        })

        // Milestones
        const { data: milestoneData } = await supabase
          .from("syllabus_progress")
          .select("*")
          .eq("student_id", studentData.id)
          .order("completed_at", { ascending: false })

        setMilestones(milestoneData || [])

        // Endorsements
        const { data: endorsementData } = await supabase
          .from("student_endorsements")
          .select("*")
          .eq("student_id", studentData.id)
          .order("created_at", { ascending: false })

        setEndorsements(endorsementData || [])
      }

      setSelfServiceLoading(false)
    }

    void fetchSelfServiceData()
  }, [user])

  // --- Fetch invoices ---
  useEffect(() => {
    if (!user) return
    const fetchInvoices = async () => {
      setInvoicesLoading(true)
      try {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        const res = await fetch('/api/student/invoices', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        setInvoices(json.invoices || [])
      } catch (err) {
        console.error('Error fetching invoices:', err)
      } finally {
        setInvoicesLoading(false)
      }
    }
    void fetchInvoices()
  }, [user])

  // --- Derived ---
  const layoutStats = useMemo(() => {
    const total = bookings.length
    const completed = bookings.filter((b) => b.status === "completed").length
    return [
      { label: "This Week", value: String(total) },
      { label: "Completed", value: String(completed) },
    ]
  }, [bookings])

  const upcomingBookings = useMemo(() => {
    const now = new Date()
    return allBookings.filter(
      (b) =>
        b.slots &&
        new Date(b.slots.start_time) > now &&
        b.status !== "canceled"
    )
  }, [allBookings])

  const pastBookings = useMemo(() => {
    const now = new Date()
    return allBookings.filter(
      (b) =>
        !b.slots ||
        new Date(b.slots.start_time) <= now ||
        b.status === "canceled"
    )
  }, [allBookings])

  // --- Auth loading ---
  if (authLoading) {
    return (
      <LearningHubLayout
        title="Your Flight Schedule"
        subtitle="View your upcoming lessons"
        activeTab="scheduling"
        stats={[]}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </LearningHubLayout>
    )
  }

  if (!user) {
    return (
      <LearningHubLayout
        title="Your Flight Schedule"
        subtitle="View your upcoming lessons"
        activeTab="scheduling"
        stats={[]}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-gray-500">Please log in to view your dashboard.</p>
          <Link href="/login" className="px-4 py-2 rounded bg-golden text-darkText font-semibold">
            Log In
          </Link>
        </div>
      </LearningHubLayout>
    )
  }

  // --- Helpers for week view ---
  const bookingsByDay = (() => {
    const groups: BookingWithSlotAndLesson[][] = Array.from({ length: 7 }, () => [])
    for (const booking of bookings) {
      if (!booking.slots) continue
      const startDate = new Date(booking.slots.start_time)
      const dayOfWeek = startDate.getDay()
      const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      groups[index].push(booking)
    }
    return groups
  })()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const formatWeekRange = () => {
    const start = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const end = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return `${start} – ${end}`
  }

  const getWeekStatusBadge = (booking: BookingWithSlotAndLesson) => {
    if (!booking.slots) return null
    const slotDate = new Date(booking.slots.start_time)
    slotDate.setHours(0, 0, 0, 0)
    if (booking.status === "completed") {
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Completed</span>
    }
    if (slotDate.getTime() === today.getTime()) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Today</span>
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Upcoming</span>
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  // --- Cancel handler ---
  const handleCancel = async (bookingId: string) => {
    setCancelingId(bookingId)
    setCancelError(null)
    setCancelSuccess(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch(`/api/student/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setCancelError(json.error || "Failed to cancel booking")
      } else {
        setCancelSuccess("Booking canceled.")
        setAllBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "canceled" } : b))
        )
      }
    } catch {
      setCancelError("Network error. Please try again.")
    } finally {
      setCancelingId(null)
    }
  }

  // --- Setup Intent handler ---
  const handleSaveCard = async () => {
    setSetupIntentLoading(true)
    setBillingError(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch("/api/student/setup-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setBillingError(json.error || "Failed to start card setup")
      } else {
        // In production, use the clientSecret with Stripe Elements.
        // For now, confirm the intent was created successfully.
        setCardSaved(true)
      }
    } catch {
      setBillingError("Network error. Please try again.")
    } finally {
      setSetupIntentLoading(false)
    }
  }

  // --- Billing Portal handler ---
  const handleBillingPortal = async () => {
    setBillingPortalLoading(true)
    setBillingError(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const res = await fetch("/api/student/billing-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setBillingError(json.error || "Failed to open billing portal")
      } else {
        const json = await res.json()
        if (json.url) {
          window.location.href = json.url
        }
      }
    } catch {
      setBillingError("Network error. Please try again.")
    } finally {
      setBillingPortalLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <LearningHubLayout
      title="Your Flight Schedule"
      subtitle="View your upcoming lessons and prepare for your flights."
      activeTab="scheduling"
      stats={layoutStats}
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-darkText">Your Flight Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">View your upcoming lessons and prepare for your flights.</p>
        </div>

        {/* ── Week Navigation ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-lg border border-gray-200 px-4 py-3">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-darkText">{formatWeekRange()}</p>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-golden hover:underline mt-0.5"
              >
                Back to this week
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>

        {/* ── Week View ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {DAY_NAMES.map((dayName, dayIndex) => {
              const dayDate = addDays(weekStart, dayIndex)
              const dayBookings = bookingsByDay[dayIndex]
              const isToday = dayDate.toDateString() === new Date().toDateString()

              return (
                <div
                  key={dayName}
                  className={`rounded-lg border ${isToday ? "border-golden/50 bg-amber-50/30" : "border-gray-200 bg-white"}`}
                >
                  <div
                    className={`px-4 py-2 border-b ${isToday ? "border-golden/30 bg-amber-50/50" : "border-gray-100 bg-gray-50"} rounded-t-lg`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-darkText">{dayName}</span>
                      <span className="text-xs text-gray-500">
                        {dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-golden text-darkText">TODAY</span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-2">
                    {dayBookings.length === 0 ? (
                      <p className="text-xs text-gray-400 py-1">No lessons scheduled</p>
                    ) : (
                      <div className="space-y-3">
                        {dayBookings.map((booking) => {
                          const lesson = booking.syllabus_lesson_id
                            ? syllabusMap[booking.syllabus_lesson_id]
                            : null
                          const isExpanded = expandedCard === booking.id

                          return (
                            <div key={booking.id} className="group">
                              <button
                                onClick={() => setExpandedCard(isExpanded ? null : booking.id)}
                                className="w-full text-left"
                              >
                                <div className="flex items-start justify-between gap-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-darkText">
                                        {formatTime(booking.slots!.start_time)} –{" "}
                                        {formatTime(booking.slots!.end_time)}
                                      </span>
                                      {getWeekStatusBadge(booking)}
                                    </div>
                                    {lesson ? (
                                      <p className="text-sm text-gray-700 mt-0.5 font-medium">
                                        Lesson {lesson.lesson_number}: {lesson.title}
                                      </p>
                                    ) : booking.slots?.description ? (
                                      <p className="text-sm text-gray-500 mt-0.5">
                                        {booking.slots.description}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-gray-500 mt-0.5">Flight Training Session</p>
                                    )}
                                    {lesson && (
                                      <p className="text-xs text-gray-400 mt-0.5 capitalize">
                                        {lesson.stage.replace(/-/g, " ")} Stage
                                      </p>
                                    )}
                                  </div>
                                  {lesson && (
                                    <span className="text-gray-400 group-hover:text-gray-600 transition-colors text-sm flex-shrink-0">
                                      {isExpanded ? "▲" : "▼"}
                                    </span>
                                  )}
                                </div>
                              </button>

                              {isExpanded && lesson && (
                                <div className="ml-4 pb-3 space-y-3 border-l-2 border-golden/40 pl-4 mt-1">
                                  {lesson.ground_topics.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-bold text-darkText uppercase tracking-wider mb-1">
                                        Ground Topics
                                      </h4>
                                      <ul className="space-y-0.5">
                                        {lesson.ground_topics.map((topic, i) => (
                                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                            <span className="text-golden mt-0.5">•</span>
                                            {topic}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {lesson.flight_maneuvers.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-bold text-darkText uppercase tracking-wider mb-1">
                                        Flight Maneuvers
                                      </h4>
                                      <ul className="space-y-0.5">
                                        {lesson.flight_maneuvers.map((maneuver, i) => (
                                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                            <span className="text-blue-500 mt-0.5">•</span>
                                            {maneuver}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {lesson.completion_standards && (
                                    <div>
                                      <h4 className="text-xs font-bold text-darkText uppercase tracking-wider mb-1">
                                        Completion Standards
                                      </h4>
                                      <p className="text-xs text-gray-600 leading-relaxed">
                                        {lesson.completion_standards}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <div className="mt-6 text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-2">No lessons scheduled this week.</p>
            <Link href="/schedule" className="text-golden hover:underline text-sm font-semibold">
              Book a Lesson →
            </Link>
          </div>
        )}

        {/* ── Self-Service Tabs ─────────────────────────────────────────────── */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-darkText mb-4">My Training Account</h2>

          {/* Tab Nav */}
          <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
            {(
              [
                { key: "history", label: "Booking History" },
                { key: "hours", label: "Flight Hours" },
                { key: "endorsements", label: "Endorsements" },
                { key: "billing", label: "Billing" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === key
                    ? "border-golden text-golden"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {selfServiceLoading ? (
            <div className="text-center py-8 text-gray-400 animate-pulse">Loading...</div>
          ) : (
            <>
              {/* ── Booking History Tab ─────────────────────────────────────── */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  {cancelError && (
                    <div className="px-4 py-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
                      {cancelError}
                    </div>
                  )}
                  {cancelSuccess && (
                    <div className="px-4 py-3 rounded bg-green-50 border border-green-200 text-sm text-green-700">
                      {cancelSuccess}
                    </div>
                  )}

                  {upcomingBookings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-darkText mb-2 uppercase tracking-wider">
                        Upcoming
                      </h3>
                      <div className="space-y-2">
                        {upcomingBookings.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-darkText">
                                {b.slots
                                  ? `${formatDate(b.slots.start_time)} · ${formatTime(b.slots.start_time)} – ${formatTime(b.slots.end_time)}`
                                  : "—"}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {b.slots?.type === "tour" ? "Discovery Flight" : "Training"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(b.status)}`}
                              >
                                {formatStatusLabel(b.status)}
                              </span>
                              {CANCELLABLE_STATUSES.includes(b.status) && (
                                <button
                                  onClick={() => handleCancel(b.id)}
                                  disabled={cancelingId === b.id}
                                  className="px-2 py-0.5 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  {cancelingId === b.id ? "Canceling..." : "Cancel"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pastBookings.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                        Past
                      </h3>
                      <div className="space-y-2">
                        {pastBookings.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-100 px-4 py-3 opacity-75"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-darkText">
                                {b.slots
                                  ? `${formatDate(b.slots.start_time)} · ${formatTime(b.slots.start_time)}`
                                  : `Booked ${formatDate(b.created_at)}`}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {b.slots?.type === "tour" ? "Discovery Flight" : "Training"}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(b.status)}`}
                            >
                              {formatStatusLabel(b.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allBookings.length === 0 && (
                    <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                      <p className="text-gray-500 mb-2">No booking history yet.</p>
                      <Link href="/schedule" className="text-golden hover:underline text-sm font-semibold">
                        Book a Lesson →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* ── Flight Hours Tab ──────────────────────────────────────── */}
              {activeTab === "hours" && (
                <div>
                  {studentHours ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        {[
                          { label: "Total Hours", value: studentHours.total_hours },
                          { label: "Solo Hours", value: studentHours.solo_hours },
                          { label: "Dual Hours", value: studentHours.dual_hours },
                          { label: "PIC Hours", value: studentHours.pic_hours },
                          { label: "Instrument Hours", value: studentHours.instrument_hours },
                          { label: "Cross Country", value: studentHours.cross_country_hours },
                        ].map(({ label, value }) => (
                          <div
                            key={label}
                            className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-center"
                          >
                            <p className="text-2xl font-bold text-darkText">{value ?? 0}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>

                      {milestones.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-darkText mb-2 uppercase tracking-wider">
                            Milestones
                          </h3>
                          <div className="space-y-2">
                            {milestones.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3"
                              >
                                <span className="text-sm text-darkText">Milestone completed</span>
                                {m.completed_at && (
                                  <span className="text-xs text-gray-500">
                                    {formatDate(m.completed_at)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {milestones.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">
                          No milestones recorded yet.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No student record found. Contact your instructor.
                    </p>
                  )}
                </div>
              )}

              {/* ── Endorsements Tab ─────────────────────────────────────── */}
              {activeTab === "endorsements" && (
                <div>
                  {endorsements.length > 0 ? (
                    <div className="space-y-3">
                      {endorsements.map((e) => (
                        <div
                          key={e.id}
                          className="bg-white rounded-lg border border-gray-200 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-darkText capitalize">
                                {e.type.replace(/_/g, " ")}
                              </p>
                              {e.notes && (
                                <p className="text-xs text-gray-500 mt-0.5">{e.notes}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              {e.issued_date && (
                                <p className="text-xs text-gray-500">
                                  Issued {formatDate(e.issued_date)}
                                </p>
                              )}
                              {e.expiration_date && (
                                <p className="text-xs text-amber-600">
                                  Expires {formatDate(e.expiration_date)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">
                      No endorsements on file yet.
                    </p>
                  )}
                </div>
              )}

              {/* ── Billing Tab ───────────────────────────────────────────── */}
              {activeTab === "billing" && (
                <div className="space-y-4">
                  {billingError && (
                    <div className="px-4 py-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
                      {billingError}
                    </div>
                  )}
                  {cardSaved && (
                    <div className="px-4 py-3 rounded bg-green-50 border border-green-200 text-sm text-green-700">
                      Card setup initiated. Your instructor will confirm the payment method.
                    </div>
                  )}

                  {/* Outstanding Invoices */}
                  <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
                    <h3 className="text-sm font-semibold text-darkText mb-3">Outstanding Invoices</h3>
                    {invoicesLoading ? (
                      <p className="text-sm text-gray-400">Loading invoices...</p>
                    ) : invoices.length === 0 ? (
                      <p className="text-sm text-gray-500">No outstanding invoices.</p>
                    ) : (
                      <div className="space-y-2">
                        {invoices.map((invoice) => (
                          <div key={invoice.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                            <div>
                              <p className="text-sm font-semibold text-darkText truncate">{invoice.description}</p>
                              <p className="text-xs text-gray-500">
                                {invoice.due_date
                                  ? `Due ${new Date(invoice.due_date * 1000).toLocaleDateString()}`
                                  : `Issued ${new Date(invoice.created * 1000).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sm font-bold text-darkText">${(invoice.amount_due / 100).toFixed(2)}</span>
                              {invoice.hosted_invoice_url && (
                                <button
                                  onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                                  className="px-3 py-1 rounded bg-golden text-darkText text-xs font-semibold hover:bg-opacity-90 transition-colors"
                                >
                                  Pay
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
                    <h3 className="text-sm font-semibold text-darkText mb-1">Save Payment Method</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Add a card on file so your instructor can bill you automatically after lessons.
                    </p>
                    <button
                      onClick={handleSaveCard}
                      disabled={setupIntentLoading}
                      className="px-4 py-2 rounded bg-golden text-darkText text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50"
                    >
                      {setupIntentLoading ? "Setting up..." : "Save Payment Method"}
                    </button>
                  </div>

                  {stripeCustomerId && (
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
                      <h3 className="text-sm font-semibold text-darkText mb-1">Manage Billing</h3>
                      <p className="text-xs text-gray-500 mb-3">
                        View invoices, update payment methods, and manage your billing history.
                      </p>
                      <button
                        onClick={handleBillingPortal}
                        disabled={billingPortalLoading}
                        className="px-4 py-2 rounded border border-gray-300 text-darkText text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {billingPortalLoading ? "Opening..." : "Open Billing Portal"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Quick Links ───────────────────────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/learn"
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-golden/50 hover:bg-amber-50/30 transition-colors"
          >
            <span className="text-xl">📖</span>
            <div>
              <p className="text-sm font-semibold text-darkText">Full Syllabus</p>
              <p className="text-xs text-gray-500">Browse all lessons</p>
            </div>
          </Link>
          <Link
            href="/progress"
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-golden/50 hover:bg-amber-50/30 transition-colors"
          >
            <span className="text-xl">📊</span>
            <div>
              <p className="text-sm font-semibold text-darkText">My Progress</p>
              <p className="text-xs text-gray-500">Track your training</p>
            </div>
          </Link>
          <Link
            href="/schedule"
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-golden/50 hover:bg-amber-50/30 transition-colors"
          >
            <span className="text-xl">✈️</span>
            <div>
              <p className="text-sm font-semibold text-darkText">Book a Lesson</p>
              <p className="text-xs text-gray-500">View available slots</p>
            </div>
          </Link>
        </div>
      </div>
    </LearningHubLayout>
  )
}
