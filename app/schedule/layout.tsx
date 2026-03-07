import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Schedule A Flight Lesson | Merlin Flight Training",
  description:
    "View availability and schedule your flight lesson, discovery flight, or training session with Merlin Flight Training.",
  openGraph: {
    title: "Schedule A Flight Lesson | Merlin Flight Training",
    description:
      "Book your next training session with flexible scheduling options.",
    url: "https://merlinflight.com/schedule",
    type: "website",
  },
  alternates: {
    canonical: "/schedule",
  },
}

export default function ScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
