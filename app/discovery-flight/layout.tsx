import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Discovery Flight in Philadelphia | $265 | KPNE Philadelphia – Merlin Flight Training",
  description: "Book a discovery flight at Northeast Philadelphia Airport (KPNE), Philadelphia, PA. See the Philadelphia skyline from above. $265, ~90 minutes, no experience needed. FAA-certified instructor Isaac Prestwich.",
  keywords: [
    "discovery flight in Philadelphia",
    "discovery flight Philadelphia",
    "intro flight lesson New York",
    "discovery flight Northeast Philadelphia Airport",
    "first flight experience NY",
    "try flying near me",
    "scenic flight New York",
  ],
  openGraph: {
    title: "Discovery Flight in Philadelphia | $265 | Merlin Flight Training",
    description: "Experience flying over Manhattan for $265. No experience needed. Northeast Philadelphia Airport (KPNE), Philadelphia, PA. Book today.",
    url: "https://merlinflighttraining.com/discovery-flight",
    type: "website",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Discovery Flight in Philadelphia – Merlin Flight Training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discovery Flight in Philadelphia | $265 – Merlin Flight Training",
    description: "Fly over Manhattan for $265. No experience needed. Book at Northeast Philadelphia Airport (KPNE).",
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
  description: "Your first hour in the air at Northeast Philadelphia Airport (KPNE), Philadelphia, PA. See the Philadelphia skyline and Independence Hall from above. No experience needed. 1-on-1 with FAA-certified instructor Isaac Prestwich.",
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
