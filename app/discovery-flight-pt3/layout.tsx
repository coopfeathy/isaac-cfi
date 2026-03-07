import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Discovery Flight Questionnaire Step 3 | Merlin Flight Training",
  description:
    "Step 3 of 4 in your discovery flight intake form.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/discovery-flight-funnel",
  },
}

export default function DiscoveryFlightPt3Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
