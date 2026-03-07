import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Discovery Flight Questionnaire Complete | Merlin Flight Training",
  description:
    "Final confirmation page for your discovery flight questionnaire.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/discovery-flight-funnel",
  },
}

export default function DiscoveryFlightPt4Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
