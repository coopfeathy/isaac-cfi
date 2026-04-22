import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "FAA AATD Credit Details | Merlin Flight Training Simulator",
  description:
    "FAA Advanced Aviation Training Device (AATD) credit details for Redbird LD, SD, FMX, and MCX simulators. Up to 20 hours toward Instrument Rating, 50 hours toward Commercial, 25 hours toward ATP, and instrument currency per Part 61 at Republic Airport (FRG).",
  keywords: [
    "FAA AATD credit",
    "Redbird simulator credit",
    "instrument rating simulator hours",
    "Part 61 AATD rules",
    "advanced aviation training device",
    "flight simulator credit Long Island",
  ],
  openGraph: {
    title: "FAA AATD Credit Details | Merlin Flight Training",
    description:
      "How many simulator hours count toward your FAA certificate or rating under Part 61, using AATD-approved Redbird devices at Merlin Flight Training.",
    url: "https://merlinflighttraining.com/simulator/aatd-credit-details",
    type: "website",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Merlin Flight Training – FAA AATD Credit Details",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAA AATD Credit Details | Merlin Flight Training",
    description:
      "How many simulator hours count toward your FAA certificate or rating under Part 61.",
    images: ["/images/merlin-og-image.jpg"],
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/simulator/aatd-credit-details",
  },
}

export default function AatdCreditDetailsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
