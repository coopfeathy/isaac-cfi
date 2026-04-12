import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Discovery Flight near NYC | $265 | Republic Airport FRG – Merlin Flight Training",
  description: "Book a discovery flight at Republic Airport (FRG), Farmingdale, NY. See the Manhattan skyline from above. $265, ~90 minutes, no experience needed. FAA-certified instructor Isaac Prestwich.",
  keywords: [
    "discovery flight near NYC",
    "discovery flight Long Island",
    "intro flight lesson New York",
    "discovery flight Republic Airport",
    "first flight experience NY",
    "try flying near me",
    "scenic flight New York",
  ],
  openGraph: {
    title: "Discovery Flight near NYC | $265 | Merlin Flight Training",
    description: "Experience flying over Manhattan for $265. No experience needed. Republic Airport (FRG), Farmingdale, NY. Book today.",
    url: "https://merlinflighttraining.com/discovery-flight",
    type: "website",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Discovery Flight near NYC – Merlin Flight Training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discovery Flight near NYC | $265 – Merlin Flight Training",
    description: "Fly over Manhattan for $265. No experience needed. Book at Republic Airport (FRG).",
    images: ["/images/merlin-og-image.jpg"],
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/discovery-flight",
  },
}

const discoveryFlightSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Discovery Flight – Merlin Flight Training",
  description: "Your first hour in the air at Republic Airport (FRG), Farmingdale, NY. See the Manhattan skyline and Statue of Liberty from above. No experience needed. 1-on-1 with FAA-certified instructor Isaac Prestwich.",
  brand: { "@type": "Brand", name: "Merlin Flight Training" },
  offers: {
    "@type": "Offer",
    price: "265",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: "https://merlinflighttraining.com/discovery-flight",
    seller: { "@type": "LocalBusiness", name: "Merlin Flight Training" },
  },
}

export default function DiscoveryFlightLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(discoveryFlightSchema) }}
      />
      {children}
    </>
  )
}
