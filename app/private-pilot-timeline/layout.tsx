import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Private Pilot Training Timeline | Merlin Flight Training",
  description:
    "Your step-by-step roadmap from discovery flight to Private Pilot certificate at Merlin Flight Training. Phased training plan covering pre-solo, cross-country, FAA knowledge test, and checkride prep at Republic Airport (FRG), Farmingdale, NY.",
  keywords: [
    "how long to get a private pilot license",
    "private pilot training timeline",
    "PPL training plan",
    "flight training phases",
    "private pilot checkride prep",
    "learn to fly timeline",
  ],
  openGraph: {
    title: "Private Pilot Training Timeline | Merlin Flight Training",
    description:
      "Phase-by-phase roadmap from discovery flight to Private Pilot certificate, based at Republic Airport (FRG) on Long Island.",
    url: "https://merlinflighttraining.com/private-pilot-timeline",
    type: "website",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Merlin Flight Training – Private Pilot Timeline",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Private Pilot Training Timeline | Merlin Flight Training",
    description:
      "Phase-by-phase roadmap from discovery flight to Private Pilot certificate.",
    images: ["/images/merlin-og-image.jpg"],
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/private-pilot-timeline",
  },
}

export default function PrivatePilotTimelineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
