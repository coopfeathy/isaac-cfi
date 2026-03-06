import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Flight Training Pricing | Merlin Flight Training",
  description: "Transparent, competitive pricing for flight training, aircraft rental, and pilot certification programs in NYC and New Jersey.",
  openGraph: {
    title: "Flight Training Pricing | Merlin Flight Training",
    description: "Transparent pricing for flight training and aircraft rental",
    url: "https://merlinflight.com/pricing",
    type: "website",
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
