import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Discovery Flight Questionnaire Step 1 | Merlin Flight Training",
  description: "Discovery flight questionnaire - Step 1 of 4.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/discovery-flight-funnel",
  },
}

export default function DiscoveryFlightPt1Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
