import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Pilot Training Programs | Private, Instrument & Commercial | Merlin Flight Training",
  description: "Explore flight training programs at Republic Airport (FRG), Farmingdale, NY. Private Pilot License, Instrument Rating, and Commercial Pilot Certificate. 1-on-1 instruction with FAA-certified CFI Isaac Prestwich.",
  keywords: [
    "private pilot training New York",
    "instrument rating Long Island",
    "commercial pilot training NYC",
    "pilot certification programs",
    "flight training programs FRG",
  ],
  openGraph: {
    title: "Pilot Training Programs | Merlin Flight Training",
    description: "Private Pilot, Instrument Rating & Commercial Pilot programs near NYC. 1-on-1 instruction at Republic Airport, Farmingdale, NY.",
    url: "https://merlinflighttraining.com/training-options",
    type: "website",
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/training-options",
  },
}

// schema.org Course structured data — describes each pilot certification track
// as a discrete schema.org Course (Google supports Course rich results, which
// can show training programs as a carousel/list in search). Wrapping the four
// programs in an ItemList makes the relationship explicit so Google groups
// them under one page-level entity. Provider info is shared across all tracks.
//
// Cost figures match those rendered on the page (training-options/page.tsx).
// Required hours come from FAA Part 61 minimums; "typical" hours reflect what
// students at Merlin actually take to checkride.
const trainingOptionsSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Pilot Training Programs at Merlin Flight Training",
  description:
    "Pilot certification programs offered at Republic Airport (FRG), Farmingdale, NY: Private Pilot, Instrument Rating, Commercial Pilot, and additional training.",
  itemListOrder: "https://schema.org/ItemListOrderAscending",
  numberOfItems: 4,
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "Course",
        name: "Private Pilot Certification",
        description:
          "Core FAA Part 61 private pilot certificate track from first lesson through checkride prep. Covers all required ground and flight training to earn your Private Pilot Certificate.",
        url: "https://merlinflighttraining.com/training-options",
        educationalCredentialAwarded: "FAA Private Pilot Certificate",
        occupationalCredentialAwarded: "FAA Private Pilot Certificate",
        timeRequired: "PT60H",
        provider: {
          "@type": "EducationalOrganization",
          name: "Merlin Flight Training",
          url: "https://merlinflighttraining.com",
          sameAs: "https://merlinflighttraining.com",
        },
        offers: {
          "@type": "Offer",
          category: "Pilot Training",
          priceCurrency: "USD",
          price: "19573",
          priceSpecification: {
            "@type": "PriceSpecification",
            priceCurrency: "USD",
            price: "19573",
            valueAddedTaxIncluded: false,
            description:
              "Estimated total (cash rate): 60 flight hours @ $185/hr aircraft rental + 84 instruction hours @ $65/hr + $3,013 startup equipment & exam bundle.",
          },
        },
      },
    },
    {
      "@type": "ListItem",
      position: 2,
      item: {
        "@type": "Course",
        name: "Instrument Rating",
        description:
          "Instrument Rating training: weather, IFR procedures, and precision flying beyond visual conditions. FAA Part 61 instrument rating add-on for certificated pilots.",
        url: "https://merlinflighttraining.com/training-options",
        educationalCredentialAwarded: "FAA Instrument Rating",
        occupationalCredentialAwarded: "FAA Instrument Rating",
        timeRequired: "PT50H",
        coursePrerequisites: "FAA Private Pilot Certificate",
        provider: {
          "@type": "EducationalOrganization",
          name: "Merlin Flight Training",
          url: "https://merlinflighttraining.com",
          sameAs: "https://merlinflighttraining.com",
        },
        offers: {
          "@type": "Offer",
          category: "Pilot Training",
          priceCurrency: "USD",
          price: "14975",
          priceSpecification: {
            "@type": "PriceSpecification",
            priceCurrency: "USD",
            price: "14975",
            valueAddedTaxIncluded: false,
            description:
              "Estimated total (cash rate): 50 flight hours @ $185/hr aircraft rental + 70 instruction hours @ $65/hr + checkride and written exam fees.",
          },
        },
      },
    },
    {
      "@type": "ListItem",
      position: 3,
      item: {
        "@type": "Course",
        name: "Commercial Pilot Certification",
        description:
          "Commercial Pilot Certificate training: professional-level maneuvers and standards required for compensated flying work. FAA Part 61 commercial certification.",
        url: "https://merlinflighttraining.com/training-options",
        educationalCredentialAwarded: "FAA Commercial Pilot Certificate",
        occupationalCredentialAwarded: "FAA Commercial Pilot Certificate",
        timeRequired: "PT120H",
        coursePrerequisites: "FAA Private Pilot Certificate, FAA Instrument Rating",
        provider: {
          "@type": "EducationalOrganization",
          name: "Merlin Flight Training",
          url: "https://merlinflighttraining.com",
          sameAs: "https://merlinflighttraining.com",
        },
        offers: {
          "@type": "Offer",
          category: "Pilot Training",
          priceCurrency: "USD",
          price: "34295",
          priceSpecification: {
            "@type": "PriceSpecification",
            priceCurrency: "USD",
            price: "34295",
            valueAddedTaxIncluded: false,
            description:
              "Estimated total (cash rate): 120 flight hours @ $185/hr aircraft rental + 168 instruction hours @ $65/hr + checkride and written exam fees.",
          },
        },
      },
    },
    {
      "@type": "ListItem",
      position: 4,
      item: {
        "@type": "Course",
        name: "Additional Training",
        description:
          "Hourly pay-as-you-train work for checkride polish, refresher flights, endorsements, and proficiency. No fixed program length.",
        url: "https://merlinflighttraining.com/training-options",
        provider: {
          "@type": "EducationalOrganization",
          name: "Merlin Flight Training",
          url: "https://merlinflighttraining.com",
          sameAs: "https://merlinflighttraining.com",
        },
        offers: {
          "@type": "Offer",
          category: "Pilot Training",
          priceCurrency: "USD",
          description:
            "Hourly billing: $65/hr instruction + $185/hr aircraft (cash) or $195/hr aircraft (card).",
        },
      },
    },
  ],
}

export default function TrainingOptionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(trainingOptionsSchema) }}
      />
      {children}
    </>
  )
}
