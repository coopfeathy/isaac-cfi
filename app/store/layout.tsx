import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Pilot Store | Flight Training Gear & Equipment | Merlin Flight Training",
  description: "Shop pilot training gear, headsets, kneeboard packages, and aviation supplies recommended by Merlin Flight Training. Everything you need to start your pilot journey.",
  keywords: [
    "pilot gear store",
    "flight training equipment",
    "aviation headset",
    "pilot supplies New York",
    "student pilot kit",
  ],
  openGraph: {
    title: "Pilot Store | Merlin Flight Training",
    description: "Flight training gear, headsets, and aviation supplies for student pilots.",
    url: "https://merlinflighttraining.com/store",
    type: "website",
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/store",
  },
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
