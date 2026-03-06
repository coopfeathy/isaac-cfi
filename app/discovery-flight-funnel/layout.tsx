import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Discovery Flight Booking | Step 1 | Merlin Flight Training",
  description: "Start your discovery flight journey. Choose your date, time, and preferences for your first flying experience.",
  openGraph: {
    title: "Discovery Flight Booking | Merlin Flight Training",
    description: "Book your discovery flight experience with Merlin Flight Training",
    url: "https://merlinflight.com/discovery-flight-funnel",
    type: "website",
  },
}

export default function DiscoveryFlightFunnelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
