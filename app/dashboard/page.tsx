"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import LearningHubLayout from "@/app/components/LearningHubLayout"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type SlotData = {
  id: string
  start_time: string
  end_time: string
  type: "training" | "tour"
  description: string | null
}

type BookingWithSlotAndLesson = {
  id: string
  status: "pending" | "paid" | "confirmed" | "canceled" | "completed"
  syllabus_lesson_id: string | null
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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [bookings, setBookings] = useState<BookingWithSlotAndLesson[]>([])
  const [syllabusMap, setSyllabusMap] = useState<Record<string, SyllabusLessonData>>({})
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const weekStart = useMemo(() => {
    const base = startOfWeekMonday(new Date())
    return addDays(base, weekOffset * 7)
  }, [weekOffset])

  const weekEnd = useMemo(() => {
    const end = addDays(weekStart, 6)
    end.setHours(23, 59, 59, 999)
    return end
  }, [weekStart])

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)

      // Fetch bookings for the selected week
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

      // Filter out bookings where the slot didn't match the date range
      const validBookings = (bookingData || [])
        .map((b: any) => ({
          ...b,
          slots: Array.isArray(b.slots) ? b.slots[0] ?? null : b.slots,
        }))
        .filter(
          (b: any) => b.slots !== null
        ) as BookingWithSlotAndLesson[]

      setBookings(validBookings)

      // Fetch syllabus data for linked lessons
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

    void fetchData()
  }, [user, weekStart, weekEnd])

  const layoutStats = useMemo(() => {
    const total = bookings.length
    const completed = bookings.filter((b) => b.status === "completed").length
    return [
      { label: "This Week", value: String(total) },
      { label: "Completed", value: String(completed) },
    ]
  }, [bookings])

  if (authLoading) {
    return (
      <LearningHubLayout title="Your Flight Schedule" subtitle="View your upcoming lessons" activeTab="scheduling" stats={[]}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </LearningHubLayout>
    )
  }

  if (!user) {
    return (
      <LearningHubLayout title="Your Flight Schedule" subtitle="View your upcoming lessons" activeTab="scheduling" stats={[]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-gray-500">Please log in to view your dashboard.</p>
          <Link href="/login" className="px-4 py-2 rounded bg-golden text-darkText font-semibold">
            Log In
          </Link>
        </div>
      </LearningHubLayout>
    )
  }

  // Group bookings by day of the week
  const bookingsByDay = useMemo(() => {
    const groups: BookingWithSlotAndLesson[][] = Array.from({ length: 7 }, () => [])

    for (const booking of bookings) {
      if (!booking.slots) continue
      const startDate = new Date(booking.slots.start_time)
      const dayOfWeek = startDate.getDay()
      // Convert Sunday=0 to index 6, Monday=1 to index 0, etc.
      const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      groups[index].push(booking)
    }

    return groups
  }, [bookings])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const formatWeekRange = () => {
    const start = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const end = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return `${start} – ${end}`
  }

  const getStatusBadge = (booking: BookingWithSlotAndLesson) => {
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

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }

  return (
    <LearningHubLayout title="Your Flight Schedule" subtitle="View your upcoming lessons and prepare for your flights." activeTab="scheduling" stats={layoutStats}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-darkText">Your Flight Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">View your upcoming lessons and prepare for your flights.</p>
        </div>

        {/* Week Navigation */}
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

        {/* Week View */}
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
                <div key={dayName} className={`rounded-lg border ${isToday ? "border-golden/50 bg-amber-50/30" : "border-gray-200 bg-white"}`}>
                  {/* Day Header */}
                  <div className={`px-4 py-2 border-b ${isToday ? "border-golden/30 bg-amber-50/50" : "border-gray-100 bg-gray-50"} rounded-t-lg`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-darkText">{dayName}</span>
                      <span className="text-xs text-gray-500">
                        {dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {isToday && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-golden text-darkText">TODAY</span>}
                    </div>
                  </div>

                  {/* Lessons */}
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
                              {/* Lesson Card */}
                              <button
                                onClick={() => setExpandedCard(isExpanded ? null : booking.id)}
                                className="w-full text-left"
                              >
                                <div className="flex items-start justify-between gap-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-darkText">
                                        {formatTime(booking.slots!.start_time)} – {formatTime(booking.slots!.end_time)}
                                      </span>
                                      {getStatusBadge(booking)}
                                    </div>
                                    {lesson ? (
                                      <p className="text-sm text-gray-700 mt-0.5 font-medium">
                                        Lesson {lesson.lesson_number}: {lesson.title}
                                      </p>
                                    ) : booking.slots?.description ? (
                                      <p className="text-sm text-gray-500 mt-0.5">{booking.slots.description}</p>
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

                              {/* Expanded Syllabus Details */}
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

        {/* Empty Week State */}
        {!loading && bookings.length === 0 && (
          <div className="mt-6 text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-2">No lessons scheduled this week.</p>
            <Link href="/schedule" className="text-golden hover:underline text-sm font-semibold">
              Book a Lesson →
            </Link>
          </div>
        )}

        {/* Quick Links */}
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
