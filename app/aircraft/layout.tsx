import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Our Fleet | Merlin Flight Training",
  description: "Explore our diverse fleet of well-maintained aircraft. From Cessna 172s for training to advanced aircraft for complex operations.",
  openGraph: {
    title: "Our Fleet | Merlin Flight Training",
    description: "Explore our diverse fleet of well-maintained aircraft",
    url: "https://merlinflight.com/aircraft",
    type: "website",
  },
}

export default function AircraftLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
