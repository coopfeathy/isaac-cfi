import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Discovery Flight | Try Flying Today | Merlin Flight Training",
  description: "Experience the thrill of flying with our discovery flight program. No experience needed. Book your flight with us today.",
  openGraph: {
    title: "Discovery Flight | Try Flying Today",
    description: "Experience the thrill of flying with our discovery flight program",
    url: "https://merlinflight.com/discovery-flight",
    type: "website",
  },
}

export default function DiscoveryFlightLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
