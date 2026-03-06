import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Expert Flight Instructors | Merlin Flight Training",
  description: "Meet our FAA-certified flight instructors with years of professional flying experience. Each instructor is committed to safety and excellence.",
  openGraph: {
    title: "Expert Flight Instructors | Merlin Flight Training",
    description: "Meet our FAA-certified, experienced flight instructors",
    url: "https://merlinflight.com/instructors",
    type: "website",
  },
}

export default function InstructorsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
