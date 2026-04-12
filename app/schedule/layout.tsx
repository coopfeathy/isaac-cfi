import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Schedule A Flight Lesson | Merlin Flight Training",
  description: "Schedule your flight lesson, discovery flight, or training session with flexible availability.",
  openGraph: {
    title: "Schedule A Flight Lesson | Merlin Flight Training",
    description:
      "Book your next training session with flexible scheduling options.",
    url: "https://merlinflighttraining.com/schedule",
    type: "website",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Merlin Flight Training – Schedule a Lesson",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Schedule A Flight Lesson | Merlin Flight Training",
    description: "Book your next training session with flexible scheduling options.",
    images: ["/images/merlin-og-image.jpg"],
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
