import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Book Your Flight | Flight Lessons & Tours | Merlin Flight Training",
  description: "Book your flight training session, discovery flight, or aircraft rental online. Easy booking process with flexible scheduling.",
  openGraph: {
    title: "Book Your Flight | Merlin Flight Training",
    description: "Easy online booking for flight training and discovery flights",
    url: "https://merlinflight.com/booking",
    type: "website",
  },
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
