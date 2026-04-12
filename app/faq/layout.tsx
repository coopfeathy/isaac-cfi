import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Flight Training FAQ | Merlin Flight Training – Republic Airport FRG",
  description: "Answers to common questions about learning to fly, flight training costs, how long it takes to get a private pilot license, and booking a discovery flight at Republic Airport, Farmingdale NY.",
  keywords: [
    "flight training FAQ",
    "how long to get private pilot license",
    "how much does flight training cost",
    "discovery flight questions",
    "pilot license requirements New York",
  ],
  openGraph: {
    title: "Flight Training FAQ | Merlin Flight Training",
    description: "Common questions about flight training costs, timelines, and getting started near NYC.",
    url: "https://merlinflighttraining.com/faq",
    type: "website",
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/faq",
  },
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How long does it take to become a pilot?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The timeline varies depending on your schedule and commitment. On average, students training 2-3 times per week can complete their Private Pilot Certificate in 6-12 months. We offer both Fast Track Training for accelerated timelines and Normal Training that works around your job or other obligations.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get started with flight training?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Getting started is easy! Schedule a discovery flight to experience flying firsthand and meet your instructor. Then apply for your FAA Medical Certificate through an Aviation Medical Examiner (AME). We'll help you apply for your Student Pilot Certificate through IACRA and create a personalized training plan. Contact us at merlinflighttraining@gmail.com or call +1 (929) 487-4717.",
      },
    },
    {
      "@type": "Question",
      name: "How much does flight training cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer transparent, fixed hourly rates based on realistic flight times. Aircraft rental starts at $185/hr (cash) for the Piper Warrior and flight instruction is $65/hr. A full Private Pilot Certificate typically costs $13,000–$14,000 including aircraft rental, instruction, equipment, and checkride fees. Discovery flights start at $265.",
      },
    },
    {
      "@type": "Question",
      name: "Is my money safe with Merlin Flight Training?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. We operate with full transparency and provide clear invoicing for all training sessions. Our fixed hourly rates mean you know exactly what you're paying for, and we accept multiple payment methods including credit and debit cards. All transactions are documented and receipted.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if I need to cancel due to weather?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Weather cancellations are a normal part of flight training and there is no penalty for weather-related cancellations. Safety is our top priority — we always get a weather briefing before each flight (call 1-800-WXBRIEF) and if conditions aren't safe, we'll reschedule at no charge. We can use weather delays as opportunities for ground instruction to keep your training progressing.",
      },
    },
    {
      "@type": "Question",
      name: "Where is Merlin Flight Training located?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We are based at Republic Airport (FRG) in Farmingdale, NY — 208 NY-109, Farmingdale, NY 11735. We serve students from across Long Island, New York City, and New Jersey.",
      },
    },
  ],
}

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  )
}
