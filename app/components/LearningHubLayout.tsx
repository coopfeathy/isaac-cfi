"use client"

import Link from "next/link"
import type React from "react"

type HubTab = "learn" | "progress" | "bookings" | "blog"

type HubStat = {
  label: string
  value: string
}

type LearningHubLayoutProps = {
  title: string
  subtitle: string
  activeTab: HubTab
  stats: HubStat[]
  children: React.ReactNode
  cta?: {
    href: string
    label: string
  }
}

const TABS: Array<{ key: HubTab; href: string; label: string }> = [
  { key: "learn", href: "/learn", label: "Courses" },
  { key: "progress", href: "/progress", label: "Progress" },
  { key: "bookings", href: "/bookings", label: "Bookings" },
  { key: "blog", href: "/blog", label: "Blog" },
]

export default function LearningHubLayout({
  title,
  subtitle,
  activeTab,
  stats,
  children,
  cta,
}: LearningHubLayoutProps) {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "28px 16px 48px" }}>
      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: "16px",
          padding: "20px",
          background: "linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "#4B5563", textTransform: "uppercase" }}>
              Student Learning Hub
            </p>
            <h1 style={{ margin: "6px 0", fontSize: "30px" }}>{title}</h1>
            <p style={{ margin: 0, color: "#4B5563" }}>{subtitle}</p>
          </div>
          {cta && (
            <Link
              href={cta.href}
              style={{
                backgroundColor: "#111827",
                color: "#fff",
                borderRadius: "10px",
                textDecoration: "none",
                padding: "10px 14px",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {cta.label}
            </Link>
          )}
        </div>
      </div>

      <div className="hub-grid" style={{ display: "grid", gap: "16px", gridTemplateColumns: "260px minmax(0, 1fr)" }}>
        <aside style={{ display: "grid", gap: "12px", alignContent: "start" }}>
          <nav style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "10px", display: "grid", gap: "8px" }}>
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: 600,
                    color: isActive ? "#111827" : "#4B5563",
                    backgroundColor: isActive ? "#E5E7EB" : "transparent",
                    border: isActive ? "1px solid #D1D5DB" : "1px solid transparent",
                  }}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          <section style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "12px", display: "grid", gap: "8px" }}>
            {stats.map((stat) => (
              <div key={stat.label} style={{ border: "1px solid #F3F4F6", borderRadius: "10px", padding: "10px" }}>
                <p style={{ margin: 0, color: "#6B7280", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {stat.label}
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "22px", fontWeight: 800 }}>{stat.value}</p>
              </div>
            ))}
          </section>
        </aside>

        <section style={{ minWidth: 0 }}>{children}</section>
      </div>

      <style jsx>{`
        @media (max-width: 960px) {
          .hub-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
