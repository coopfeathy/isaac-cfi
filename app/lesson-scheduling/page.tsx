"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import LearningHubLayout from "@/app/components/LearningHubLayout"
import { useAuth } from "@/app/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type BookingWithSlot = {
  id: string
  status: "pending" | "paid" | "confirmed" | "canceled" | "completed"
  created_at: string
  slots: {
    id: string
    type: "training" | "tour"
    start_time: string
    end_time: string
    description: string | null
  } | null
}

type SchedulingGoalRow = {
  student_id: string
  weekly_goal: number
}

type RingSegment = {
  startAngle: number
  endAngle: number
  color: string
}

const DEFAULT_WEEKLY_GOAL = 2

const startOfWeekMonday = (value: Date) => {
  const date = new Date(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const endOfWeekSunday = (value: Date) => {
  const start = startOfWeekMonday(value)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleDeg: number) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  }
}

const describeDonutSegment = (
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) => {
  const startOuter = polarToCartesian(centerX, centerY, outerRadius, endAngle)
  const endOuter = polarToCartesian(centerX, centerY, outerRadius, startAngle)
  const startInner = polarToCartesian(centerX, centerY, innerRadius, endAngle)
  const endInner = polarToCartesian(centerX, centerY, innerRadius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ")
}

export default function LessonSchedulingPage() {
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<BookingWithSlot[]>([])
  const [weeklyGoal, setWeeklyGoal] = useState(DEFAULT_WEEKLY_GOAL)
  const [goalDraft, setGoalDraft] = useState(String(DEFAULT_WEEKLY_GOAL))
  const [savingGoal, setSavingGoal] = useState(false)
  const [goalStatusMessage, setGoalStatusMessage] = useState("")

  useEffect(() => {
    const fetchSchedulingData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      setLoading(true)

      const [bookingsResult, goalResult] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, status, created_at, slots(id, type, start_time, end_time, description)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("student_lesson_scheduling_goals")
          .select("student_id, weekly_goal")
          .eq("student_id", user.id)
          .maybeSingle(),
      ])

      const nextBookings = ((bookingsResult.data as any[]) || []).map((row) => ({
        ...row,
        slots: Array.isArray(row.slots) ? row.slots[0] || null : row.slots,
      })) as BookingWithSlot[]

      setBookings(nextBookings)

      const dbGoal = (goalResult.data as SchedulingGoalRow | null)?.weekly_goal || DEFAULT_WEEKLY_GOAL
      setWeeklyGoal(dbGoal)
      setGoalDraft(String(dbGoal))
      setLoading(false)
    }

    fetchSchedulingData()
  }, [user])

  const now = useMemo(() => new Date(), [])
  const weekStart = useMemo(() => startOfWeekMonday(now), [now])
  const weekEnd = useMemo(() => endOfWeekSunday(now), [now])
  const aheadWindowEnd = useMemo(() => {
    const future = new Date(now)
    future.setDate(future.getDate() + 14)
    return future
  }, [now])

  const trainingBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        if (!booking.slots) return false
        if (booking.slots.type !== "training") return false
        return true
      }),
    [bookings]
  )

  const completedThisWeek = useMemo(
    () =>
      trainingBookings.filter((booking) => {
        if (booking.status !== "completed") return false
        if (!booking.slots?.start_time) return false
        const start = new Date(booking.slots.start_time)
        return start >= weekStart && start <= weekEnd
      }),
    [trainingBookings, weekStart, weekEnd]
  )

  const scheduledThisWeek = useMemo(
    () =>
      trainingBookings.filter((booking) => {
        if (!(booking.status === "pending" || booking.status === "paid" || booking.status === "confirmed")) {
          return false
        }
        if (!booking.slots?.start_time) return false
        const start = new Date(booking.slots.start_time)
        return start >= weekStart && start <= weekEnd
      }),
    [trainingBookings, weekStart, weekEnd]
  )

  const upcomingTwoWeeks = useMemo(
    () =>
      trainingBookings
        .filter((booking) => {
          if (!(booking.status === "pending" || booking.status === "paid" || booking.status === "confirmed")) {
            return false
          }
          if (!booking.slots?.start_time) return false
          const start = new Date(booking.slots.start_time)
          return start >= now && start <= aheadWindowEnd
        })
        .sort((left, right) => new Date(left.slots!.start_time).getTime() - new Date(right.slots!.start_time).getTime()),
    [trainingBookings, now, aheadWindowEnd]
  )

  const completedCount = completedThisWeek.length
  const scheduledCount = scheduledThisWeek.length
  const actualCount = completedCount + scheduledCount
  const neededCount = Math.max(weeklyGoal - actualCount, 0)
  const ringCount = Math.max(weeklyGoal, actualCount, 1)

  const ringSegments = useMemo<RingSegment[]>(() => {
    const segments: RingSegment[] = []
    const gap = ringCount > 1 ? 3 : 0
    const totalGap = gap * ringCount
    const usableDegrees = 360 - totalGap
    const each = usableDegrees / ringCount

    let cursor = 0
    for (let index = 0; index < ringCount; index += 1) {
      const start = cursor
      const end = cursor + each
      let color = "#D1D5DB"

      if (index < completedCount) {
        color = "#16A34A"
      } else if (index < completedCount + scheduledCount) {
        color = "#9CA3AF"
      } else {
        color = "#DC2626"
      }

      segments.push({ startAngle: start, endAngle: end, color })
      cursor = end + gap
    }

    return segments
  }, [ringCount, completedCount, scheduledCount])

  const aheadStatus = useMemo(() => {
    if (upcomingTwoWeeks.length >= 2) {
      return {
        tone: "#166534",
        background: "#DCFCE7",
        border: "#86EFAC",
        message: "Great pacing. You are scheduled at least 1-2 weeks ahead.",
      }
    }

    if (upcomingTwoWeeks.length === 1) {
      return {
        tone: "#92400E",
        background: "#FEF3C7",
        border: "#FCD34D",
        message: "You are only one lesson ahead. Schedule one more training event to stay 1-2 weeks ahead.",
      }
    }

    return {
      tone: "#991B1B",
      background: "#FEE2E2",
      border: "#FECACA",
      message: "You are not scheduled 1-2 weeks ahead. Book upcoming training events now.",
    }
  }, [upcomingTwoWeeks.length])

  const handleSaveGoal = async () => {
    if (!user) return

    const parsed = Number(goalDraft)
    const normalized = Number.isInteger(parsed) ? Math.min(14, Math.max(1, parsed)) : DEFAULT_WEEKLY_GOAL

    setSavingGoal(true)
    setGoalStatusMessage("")

    const { error } = await supabase
      .from("student_lesson_scheduling_goals")
      .upsert(
        [
          {
            student_id: user.id,
            weekly_goal: normalized,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "student_id" }
      )

    if (error) {
      setGoalStatusMessage(error.message)
      setSavingGoal(false)
      return
    }

    setWeeklyGoal(normalized)
    setGoalDraft(String(normalized))
    setGoalStatusMessage("Weekly lesson goal saved.")
    setSavingGoal(false)
  }

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "36px 16px" }}>
        <p>Loading scheduling dashboard...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "36px 16px" }}>
        <h1>Lesson Scheduling Dashboard</h1>
        <p>
          Please <Link href="/login">sign in</Link> to view your scheduling goals.
        </p>
      </div>
    )
  }

  return (
    <LearningHubLayout
      title="Lesson Scheduling Dashboard"
      subtitle="Track weekly lesson targets, keep your activity ring in the green, and stay 1-2 weeks ahead."
      activeTab="scheduling"
      headerVariant="schedule"
      stats={[
        { label: "Weekly Goal", value: `${weeklyGoal} events` },
        { label: "This Week", value: `${actualCount}/${weeklyGoal}` },
        { label: "2-Week Ahead", value: `${upcomingTwoWeeks.length} scheduled` },
      ]}
      cta={{ href: "/schedule", label: "Book Training Slot" }}
    >
      <div style={{ display: "grid", gap: "16px" }}>
        <section
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            background: "#FFFFFF",
            padding: "16px",
            display: "grid",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "20px",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <svg viewBox="0 0 220 220" width="220" height="220" aria-label="Weekly training event activity ring">
                {ringSegments.map((segment, index) => (
                  <path
                    key={`segment-${index}`}
                    d={describeDonutSegment(110, 110, 100, 72, segment.startAngle, segment.endAngle)}
                    fill={segment.color}
                  />
                ))}
                <circle cx="110" cy="110" r="62" fill="#FFFFFF" />
                <text x="110" y="104" textAnchor="middle" fill="#111827" fontSize="30" fontWeight="700">
                  {actualCount}
                </text>
                <text x="110" y="126" textAnchor="middle" fill="#6B7280" fontSize="12" fontWeight="600">
                  THIS WEEK
                </text>
              </svg>
              <p style={{ margin: 0, fontSize: "12px", color: "#6B7280" }}>
                Green: completed | Gray: scheduled | Red: below weekly goal
              </p>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <h2 style={{ margin: 0 }}>Weekly Goal and Ring Status</h2>
              <p style={{ margin: 0, color: "#4B5563" }}>
                Set how many training events you want each week. Your ring updates as events are scheduled and completed.
              </p>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <label htmlFor="weekly-goal" style={{ fontWeight: 600, fontSize: "14px" }}>
                  Weekly lesson goal
                </label>
                <input
                  id="weekly-goal"
                  type="number"
                  min={1}
                  max={14}
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  style={{ width: "100px", padding: "8px 10px", border: "1px solid #D1D5DB", borderRadius: "8px" }}
                />
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  disabled={savingGoal}
                  style={{
                    background: "#111827",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: savingGoal ? 0.7 : 1,
                  }}
                >
                  {savingGoal ? "Saving..." : "Save Goal"}
                </button>
              </div>

              {goalStatusMessage && <p style={{ margin: 0, fontSize: "13px", color: "#4B5563" }}>{goalStatusMessage}</p>}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
                <div style={{ border: "1px solid #E5E7EB", borderRadius: "10px", padding: "10px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Completed
                  </p>
                  <p style={{ margin: "6px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#16A34A" }}>{completedCount}</p>
                </div>
                <div style={{ border: "1px solid #E5E7EB", borderRadius: "10px", padding: "10px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Scheduled
                  </p>
                  <p style={{ margin: "6px 0 0 0", fontSize: "22px", fontWeight: 800, color: "#6B7280" }}>{scheduledCount}</p>
                </div>
                <div style={{ border: "1px solid #E5E7EB", borderRadius: "10px", padding: "10px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Needed
                  </p>
                  <p style={{ margin: "6px 0 0 0", fontSize: "22px", fontWeight: 800, color: neededCount > 0 ? "#DC2626" : "#16A34A" }}>
                    {neededCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            border: `1px solid ${aheadStatus.border}`,
            borderRadius: "12px",
            background: aheadStatus.background,
            color: aheadStatus.tone,
            padding: "14px 16px",
            display: "grid",
            gap: "8px",
          }}
        >
          <h3 style={{ margin: 0 }}>Ahead-of-Schedule Check (1-2 Weeks)</h3>
          <p style={{ margin: 0 }}>{aheadStatus.message}</p>
          {upcomingTwoWeeks[0]?.slots?.start_time && (
            <p style={{ margin: 0, fontSize: "13px" }}>
              Next scheduled training event: {new Date(upcomingTwoWeeks[0].slots.start_time).toLocaleString()}
            </p>
          )}
        </section>

        <section style={{ border: "1px solid #E5E7EB", borderRadius: "12px", background: "#FFFFFF", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>Upcoming 14-Day Training Events</h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Link
                href="/schedule"
                style={{
                  border: "1px solid #111827",
                  color: "#111827",
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                Find Open Slots
              </Link>
              <Link
                href="/bookings"
                style={{
                  border: "1px solid #D1D5DB",
                  color: "#374151",
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                View My Bookings
              </Link>
            </div>
          </div>

          {upcomingTwoWeeks.length === 0 ? (
            <p style={{ marginTop: "12px", marginBottom: 0, color: "#6B7280" }}>
              No training events are scheduled in the next 14 days.
            </p>
          ) : (
            <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
              {upcomingTwoWeeks.map((booking) => (
                <div key={booking.id} style={{ border: "1px solid #E5E7EB", borderRadius: "10px", padding: "10px 12px", background: "#F9FAFB" }}>
                  <p style={{ margin: 0, fontWeight: 700, color: "#111827" }}>
                    {booking.slots?.description || "Flight Training Lesson"}
                  </p>
                  <p style={{ margin: "4px 0 0 0", color: "#4B5563", fontSize: "14px" }}>
                    {booking.slots?.start_time ? new Date(booking.slots.start_time).toLocaleString() : "Time pending"}
                  </p>
                  <p style={{ margin: "4px 0 0 0", color: "#6B7280", fontSize: "12px", textTransform: "capitalize" }}>
                    Status: {booking.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </LearningHubLayout>
  )
}
