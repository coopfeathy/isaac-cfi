import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Apply For Flight Training | Merlin Flight Training",
  description: "Apply for flight training. Share your goals and we'll map your path to pilot certification.",
  openGraph: {
    title: "Apply For Flight Training | Merlin Flight Training",
    description:
      "Apply to begin your flight training journey and connect with our FAA-certified instructors.",
    url: "https://merlinflighttraining.com/apply",
    type: "website",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Merlin Flight Training – Apply for Training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Apply For Flight Training | Merlin Flight Training",
    description: "Apply to begin your flight training journey and connect with our FAA-certified instructors.",
    images: ["/images/merlin-og-image.jpg"],
  },
  alternates: {
    canonical: "/apply",
  },
}

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
