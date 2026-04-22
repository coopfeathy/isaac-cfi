import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Book a Flight Lesson | Merlin Flight Training – Republic Airport (FRG)",
  description:
    "Schedule your next flight lesson at Merlin Flight Training. Pick an available slot on our in-house calendar for instruction at Republic Airport (FRG), Farmingdale, NY. Private pilot, instrument, and commercial students welcome.",
  keywords: [
    "book flight lesson Long Island",
    "schedule pilot training NYC",
    "Republic Airport flight lesson",
    "Farmingdale NY flight instructor booking",
    "private pilot lesson scheduling",
  ],
  openGraph: {
    title: "Book a Flight Lesson | Merlin Flight Training",
    description:
      "Schedule your next flight lesson at Republic Airport (FRG), Farmingdale, NY. Pick an available slot on our in-house calendar.",
    url: "https://merlinflighttraining.com/book-lesson",
    type: "website",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Merlin Flight Training – Book a Flight Lesson",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Book a Flight Lesson | Merlin Flight Training",
    description:
      "Schedule your next flight lesson at Republic Airport (FRG), Farmingdale, NY.",
    images: ["/images/merlin-og-image.jpg"],
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/book-lesson",
  },
}

export default function BookLessonLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
