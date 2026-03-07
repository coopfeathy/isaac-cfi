import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Apply For Flight Training | Merlin Flight Training",
  description: "Apply for flight training. Share your goals and we'll map your path to pilot certification.",
  openGraph: {
    title: "Apply For Flight Training | Merlin Flight Training",
    description:
      "Apply to begin your flight training journey and connect with our FAA-certified instructors.",
    url: "https://merlinflight.com/apply",
    type: "website",
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
