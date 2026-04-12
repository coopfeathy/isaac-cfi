import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Flight Training Pricing | Merlin Flight Training – Farmingdale, NY",
  description: "Transparent flight training pricing at Republic Airport (FRG). Private pilot license from ~$13,810 (cash), instrument rating ~$12,175, discovery flights from $265. Aircraft rental $185/hr, instruction $65/hr.",
  keywords: [
    "flight training cost New York",
    "private pilot license cost Long Island",
    "discovery flight price",
    "aircraft rental FRG Republic Airport",
    "how much does flight school cost",
    "pilot training pricing",
  ],
  openGraph: {
    title: "Flight Training Pricing | Merlin Flight Training",
    description: "Transparent pricing for flight training near NYC. Discovery flights from $265. Private pilot license from $13,810. Aircraft rental $185/hr.",
    url: "https://merlinflighttraining.com/pricing",
    type: "website",
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/pricing",
  },
}

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Merlin Flight Training — Services & Pricing",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "Service",
        name: "Discovery Flight",
        description: "Your first hour in the air. No experience needed. See Manhattan from above and decide if flying is for you. Based at Republic Airport (FRG), Farmingdale, NY.",
        provider: { "@type": "LocalBusiness", name: "Merlin Flight Training" },
        areaServed: ["Long Island, NY", "New York City", "New Jersey"],
        offers: {
          "@type": "Offer",
          price: "265",
          priceCurrency: "USD",
          url: "https://merlinflighttraining.com/discovery-flight",
        },
      },
    },
    {
      "@type": "ListItem",
      position: 2,
      item: {
        "@type": "Service",
        name: "Private Pilot License Training",
        description: "FAA Part 61 private pilot certificate training with 1-on-1 personalized instruction at Republic Airport, Farmingdale, NY.",
        provider: { "@type": "LocalBusiness", name: "Merlin Flight Training" },
        offers: {
          "@type": "Offer",
          price: "13810",
          priceCurrency: "USD",
          description: "Estimated total including aircraft rental, instruction, equipment, and checkride fees (cash price).",
        },
      },
    },
    {
      "@type": "ListItem",
      position: 3,
      item: {
        "@type": "Service",
        name: "Instrument Rating Training",
        description: "FAA instrument rating training for licensed pilots. Fly in clouds and low visibility conditions with advanced avionics.",
        provider: { "@type": "LocalBusiness", name: "Merlin Flight Training" },
        offers: {
          "@type": "Offer",
          price: "12175",
          priceCurrency: "USD",
          description: "Estimated total including aircraft rental, instruction, and checkride fees (cash price).",
        },
      },
    },
    {
      "@type": "ListItem",
      position: 4,
      item: {
        "@type": "Service",
        name: "Commercial Pilot Training",
        description: "FAA commercial pilot certificate training. Qualify to fly for compensation or hire.",
        provider: { "@type": "LocalBusiness", name: "Merlin Flight Training" },
        offers: {
          "@type": "Offer",
          price: "26340",
          priceCurrency: "USD",
          description: "Estimated total including aircraft rental, instruction, and checkride fees (cash price).",
        },
      },
    },
  ],
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
      {children}
    </>
  )
}
