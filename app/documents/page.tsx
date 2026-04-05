"use client"

import { useState } from "react"
import LearningHubLayout from "@/app/components/LearningHubLayout"

const SYLLABUS_PDF = "/The Total Private Pilot Syllabus.pdf"

export default function DocumentsPage() {
  const [viewerOpen, setViewerOpen] = useState(false)

  return (
    <LearningHubLayout
      title="Training Documents"
      subtitle="Your Private Pilot syllabus — complete training plan from first flight to checkride."
      activeTab="documents"
      headerVariant="schedule"
    >
      {/* Syllabus Card */}
      <div style={{ maxWidth: "600px" }}>
        <div
          onClick={() => setViewerOpen(true)}
          style={{
            backgroundColor: "white",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            overflow: "hidden",
            cursor: "pointer",
            transition: "box-shadow 0.2s, transform 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"
            e.currentTarget.style.transform = "translateY(-2px)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none"
            e.currentTarget.style.transform = "translateY(0)"
          }}
        >
          {/* PDF Preview */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "360px",
              backgroundColor: "#F9FAFB",
              borderBottom: "1px solid #E5E7EB",
              overflow: "hidden",
            }}
          >
            <iframe
              src={`${SYLLABUS_PDF}#toolbar=0&navpanes=0&scrollbar=0`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                pointerEvents: "none",
              }}
              title="Syllabus Preview"
            />
            {/* Overlay so the card click works */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0)",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.05)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0)"
              }}
            >
              <span
                style={{
                  backgroundColor: "white",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#374151",
                  opacity: 0,
                  transition: "opacity 0.2s",
                  pointerEvents: "none",
                }}
                className="preview-hint"
              >
                Click to view
              </span>
            </div>
          </div>

          {/* Card Info */}
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" }}>
                  Private Pilot Syllabus
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#6B7280" }}>
                  FAA Part 61 — 32 lessons across Pre-Solo, Cross-Country &amp; Checkride Prep
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div style={{ marginTop: "16px" }}>
          <a
            href={SYLLABUS_PDF}
            download="Private-Pilot-Syllabus.pdf"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#1D4ED8",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#1E40AF"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1D4ED8"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download Syllabus PDF
          </a>
        </div>
      </div>

      {/* Full-screen PDF Viewer Modal */}
      {viewerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
              backgroundColor: "#111827",
              color: "white",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: 600 }}>Private Pilot Syllabus</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <a
                href={SYLLABUS_PDF}
                download="Private-Pilot-Syllabus.pdf"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#1D4ED8",
                  color: "white",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download
              </a>
              <button
                onClick={() => setViewerOpen(false)}
                style={{
                  background: "none",
                  border: "1px solid #4B5563",
                  borderRadius: "6px",
                  color: "white",
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* PDF Embed */}
          <div style={{ flex: 1 }}>
            <iframe
              src={SYLLABUS_PDF}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
              title="Syllabus Viewer"
            />
          </div>
        </div>
      )}

      {/* Hover hint CSS */}
      <style>{`
        div:hover .preview-hint {
          opacity: 1 !important;
        }
      `}</style>
    </LearningHubLayout>
  )
}
