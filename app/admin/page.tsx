"use client"

import { useEffect } from "react"
import { useAuth } from "@/app/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AdminDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAdmin) {
      router.push("/login")
      return
    }
  }, [authLoading, isAdmin, router])

  if (authLoading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ marginBottom: "10px", fontSize: "32px", fontWeight: "700" }}>Admin Dashboard</h1>
      <p style={{ color: "#6B7280", marginBottom: "40px" }}>
        Welcome back, {user?.email}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        
        {/* Learn Platform Management */}
        <div style={{
          backgroundColor: "white",
          border: "2px solid #C59A2A",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <h2 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            marginBottom: "12px",
            color: "#C59A2A"
          }}>
            📚 Learn Platform
          </h2>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "20px" }}>
            Manage courses, lessons, videos, and student enrollments
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              href="/admin/courses"
              style={{
                display: "block",
                padding: "10px 16px",
                backgroundColor: "#C59A2A",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              Manage Courses
            </Link>
            <Link
              href="/admin/enrollments"
              style={{
                display: "block",
                padding: "10px 16px",
                backgroundColor: "#F59E0B",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              Assign Students
            </Link>
            <Link
              href="/admin/progress"
              style={{
                display: "block",
                padding: "10px 16px",
                backgroundColor: "#7C3AED",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              Lesson Debriefs
            </Link>
          </div>
        </div>

        {/* Student & Prospect Management */}
        <div style={{
          backgroundColor: "white",
          border: "2px solid #3B82F6",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <h2 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            marginBottom: "12px",
            color: "#3B82F6"
          }}>
            👥 Students & Prospects
          </h2>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "20px" }}>
            View and manage students, prospects, and leads
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              href="/students"
              style={{
                display: "block",
                padding: "10px 16px",
                backgroundColor: "#3B82F6",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              Students
            </Link>
            <Link
              href="/prospects"
              style={{
                display: "block",
                padding: "10px 16px",
                backgroundColor: "#8B5CF6",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              Prospects
            </Link>
          </div>
        </div>

        {/* Bookings & Scheduling */}
        <div style={{
          backgroundColor: "white",
          border: "2px solid #10B981",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <h2 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            marginBottom: "12px",
            color: "#10B981"
          }}>
            📅 Bookings & Schedule
          </h2>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "20px" }}>
            Manage flight bookings and time slots
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              href="/dashboard"
              style={{
                display: "block",
                padding: "10px 16px",
                backgroundColor: "#10B981",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{
          backgroundColor: "white",
          border: "2px solid #6B7280",
          borderRadius: "12px",
          padding: "24px"
        }}>
          <h2 style={{ 
            fontSize: "20px", 
            fontWeight: "600", 
            marginBottom: "12px",
            color: "#6B7280"
          }}>
            📊 Quick Actions
          </h2>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "20px" }}>
            Other administrative functions
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              href="/schedule"
              style={{
                display: "block",
                padding: "10px 16px",
                backgroundColor: "#6B7280",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              View Schedule
            </Link>
            <Link
              href="/bookings"
              style={{
                display: "block",
                padding: "10px 16px",
                backgroundColor: "#6B7280",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              All Bookings
            </Link>
          </div>
        </div>

      </div>

      <div style={{
        marginTop: "40px",
        padding: "20px",
        backgroundColor: "#FEF3C7",
        border: "1px solid #FCD34D",
        borderRadius: "8px"
      }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", color: "#92400E" }}>
          💡 Getting Started
        </h3>
        <ul style={{ fontSize: "14px", color: "#78350F", lineHeight: "1.8", paddingLeft: "20px" }}>
          <li><strong>Learn Platform:</strong> Create courses, add units/lessons, upload videos, and assign students</li>
          <li><strong>Debriefs:</strong> Update syllabus progress, rate lesson performance, and email students automatically</li>
          <li><strong>Students:</strong> View all registered users and their training progress</li>
          <li><strong>Prospects:</strong> Manage leads and potential students from discovery flights</li>
          <li><strong>Bookings:</strong> Manage flight slots, bookings, and schedules</li>
        </ul>
      </div>
    </div>
  )
}
