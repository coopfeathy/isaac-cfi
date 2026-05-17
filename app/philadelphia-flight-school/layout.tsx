import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Philadelphia Flight School | KPNE Flight Training | Merlin Flight Training",
  description:
    "The Philadelphia metro's home for 1-on-1 flight training. FAA-certified instruction at Northeast Philadelphia Airport (KPNE). Discovery flights, Private Pilot, Instrument Rating in a Grumman Cheetah AA-5A. Serving Center City, Bucks County, Montgomery County & South Jersey.",
  keywords: [
    "Philadelphia flight school",
    "flight school Philadelphia",
    "flight school near Philadelphia",
    "KPNE flight school",
    "Northeast Philadelphia Airport flight training",
    "flight training Philadelphia PA",
    "private pilot license Philadelphia",
    "discovery flight Philadelphia",
    "flight school Bucks County",
    "flight school Montgomery County",
    "flight school South Jersey",
    "CFI Philadelphia",
    "learn to fly Philadelphia",
    "best flight school Philadelphia",
    "Grumman Cheetah training Philadelphia",
  ],
  openGraph: {
    title: "Philadelphia Flight School at KPNE | Merlin Flight Training",
    description:
      "FAA-certified 1-on-1 flight training at Northeast Philadelphia Airport (KPNE). Discovery flights from $150, Private Pilot, Instrument Rating. Serving Philadelphia, Bucks County, Montgomery County & South Jersey.",
    url: "https://merlinflighttraining.com/philadelphia-flight-school",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Philadelphia Flight School at KPNE | Merlin Flight Training",
    description:
      "FAA-certified 1-on-1 flight training at Northeast Philadelphia Airport (KPNE). Discovery flights, Private Pilot, Instrument Rating.",
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/philadelphia-flight-school",
  },
}

// FAQPage JSON-LD targeting actual Philly-area search queries. Each Q is one
// students/prospects type into Google verbatim; each A is conversational
// enough to be quoted as a rich snippet.
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Where is the closest flight school to Philadelphia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Merlin Flight Training operates out of Northeast Philadelphia Airport (KPNE) — the closest fully-public airport to Center City Philadelphia. It's about 25 minutes from City Hall, 15 minutes from Bensalem, 30 minutes from Cherry Hill or King of Prussia, and 35 minutes from Doylestown.",
      },
    },
    {
      "@type": "Question",
      name: "How much does it cost to get a Private Pilot License in Philadelphia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A full Private Pilot Certificate at Merlin typically costs $13,000–$14,000, including aircraft rental, instruction, equipment, written exam, and the checkride. We use a Grumman Cheetah AA-5A as the trainer. See the pricing page for the detailed breakdown.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to get a pilot license in Philadelphia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FAA Part 61 requires 40 flight hours minimum, but most students take 50–70 hours over 6–12 months while balancing a day job. Students who fly twice a week typically finish in 6 months; once-a-week students take 10–12 months.",
      },
    },
    {
      "@type": "Question",
      name: "Do you offer flight training in Bucks County or Montgomery County?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. While our home base is Northeast Philadelphia Airport (KPNE), most of our students drive in from Bucks County (Doylestown, Newtown, Yardley), Montgomery County (King of Prussia, Norristown, Plymouth Meeting), and South Jersey (Cherry Hill, Mt. Laurel). KPNE is more convenient than Wings Field or Doylestown for the majority of the Philly metro.",
      },
    },
    {
      "@type": "Question",
      name: "What's a discovery flight and how much does it cost at KPNE?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A discovery flight is your first time at the controls — a ~60-minute experience where you sit in the left seat, take off with the instructor, fly over Center City Philadelphia and the Delaware River, and land at KPNE. It's $150 and includes the pre-flight brief and post-flight debrief. No prior experience needed.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to fly to KPNE? Can I drive?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You drive. Northeast Philadelphia Airport (KPNE) is a normal public airport with free parking on the field. Students arrive by car, train, or rideshare. The airport is at 9800 Ashton Rd, Philadelphia, PA 19114.",
      },
    },
  ],
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Merlin Flight Training",
      item: "https://merlinflighttraining.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Philadelphia Flight School",
      item: "https://merlinflighttraining.com/philadelphia-flight-school",
    },
  ],
}

export default function PhiladelphiaFlightSchoolLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  )
}
