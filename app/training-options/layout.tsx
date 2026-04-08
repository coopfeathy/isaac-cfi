import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Pilot Training Programs | Private, Instrument & Commercial | Merlin Flight Training",
  description: "Explore flight training programs at Republic Airport (FRG), Farmingdale, NY. Private Pilot License, Instrument Rating, and Commercial Pilot Certificate. 1-on-1 instruction with FAA-certified CFI Isaac Prestwich.",
  keywords: [
    "private pilot training New York",
    "instrument rating Long Island",
    "commercial pilot training NYC",
    "pilot certification programs",
    "flight training programs FRG",
  ],
  openGraph: {
    title: "Pilot Training Programs | Merlin Flight Training",
    description: "Private Pilot, Instrument Rating & Commercial Pilot programs near NYC. 1-on-1 instruction at Republic Airport, Farmingdale, NY.",
    url: "https://merlinflight.com/training-options",
    type: "website",
  },
  alternates: {
    canonical: "https://merlinflight.com/training-options",
  },
}

export default function TrainingOptionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
