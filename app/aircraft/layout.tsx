import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Our Fleet | Merlin Flight Training",
  description: "Explore our fleet of well-maintained aircraft for training & advanced operations.",
  alternates: {
    canonical: "https://merlinflighttraining.com/aircraft",
  },
  openGraph: {
    title: "Our Fleet | Merlin Flight Training",
    description: "Explore our diverse fleet of well-maintained aircraft",
    url: "https://merlinflighttraining.com/aircraft",
    type: "website",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Merlin Flight Training – Our Aircraft Fleet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Fleet | Merlin Flight Training",
    description: "Explore our diverse fleet of well-maintained aircraft.",
    images: ["/images/merlin-og-image.jpg"],
  },
}

export default function AircraftLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
