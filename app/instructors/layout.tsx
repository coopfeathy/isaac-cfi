import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Expert Flight Instructors | Merlin Flight Training",
  description: "Meet our FAA-certified flight instructors. Professional instructors committed to safety and excellence.",
  alternates: {
    canonical: "https://merlinflighttraining.com/instructors",
  },
  openGraph: {
    title: "Expert Flight Instructors | Merlin Flight Training",
    description: "Meet our FAA-certified, experienced flight instructors",
    url: "https://merlinflighttraining.com/instructors",
    type: "website",
  },
}

// SEO: schema.org @graph combining
//   1) BreadcrumbList — Home > Instructors  (eligible for breadcrumb rich result
//      in Google search, complements the per-blog-post BreadcrumbList in
//      app/blog/[slug]/page.tsx)
//   2) Person nodes for each instructor — entity-graph signal that Isaac
//      Prestwich and Maria are real CFIs employed by Merlin Flight Training,
//      with their certifications modelled as schema.org/EducationalOccupational-
//      Credential. This complements the root layout's FlightSchool/LocalBusiness
//      JSON-LD by adding the staff dimension to the entity graph.
// Pure static JSON-LD — no imports, no runtime logic, no client behavior.
const baseUrl = "https://merlinflighttraining.com"
const flightSchoolRef = { "@type": "FlightSchool", name: "Merlin Flight Training", url: baseUrl }

const instructorsSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
        { "@type": "ListItem", position: 2, name: "Instructors", item: `${baseUrl}/instructors` },
      ],
    },
    {
      "@type": "Person",
      "@id": `${baseUrl}/instructors#isaac-prestwich`,
      name: "Isaac Prestwich",
      givenName: "Isaac",
      familyName: "Prestwich",
      jobTitle: "Chief Flight Instructor",
      description:
        "Founder of Merlin Flight Training. FAA-certified flight instructor (CFI, CFII, MEI) teaching Private Pilot, Instrument Rating, and Commercial Pilot students at Republic Airport (FRG), Farmingdale, NY.",
      worksFor: flightSchoolRef,
      affiliation: flightSchoolRef,
      knowsAbout: [
        "Flight Instruction",
        "Private Pilot Training",
        "Instrument Rating Training",
        "Commercial Pilot Training",
        "Multi-Engine Flight Instruction",
        "Aviation Safety",
      ],
      hasCredential: [
        {
          "@type": "EducationalOccupationalCredential",
          credentialCategory: "certification",
          name: "Certified Flight Instructor (CFI)",
          recognizedBy: { "@type": "Organization", name: "Federal Aviation Administration" },
        },
        {
          "@type": "EducationalOccupationalCredential",
          credentialCategory: "certification",
          name: "Certified Flight Instructor – Instrument (CFII)",
          recognizedBy: { "@type": "Organization", name: "Federal Aviation Administration" },
        },
        {
          "@type": "EducationalOccupationalCredential",
          credentialCategory: "certification",
          name: "Multi-Engine Instructor (MEI)",
          recognizedBy: { "@type": "Organization", name: "Federal Aviation Administration" },
        },
      ],
      sameAs: ["https://www.tiktok.com/@isaacthecfi"],
    },
    {
      "@type": "Person",
      "@id": `${baseUrl}/instructors#maria`,
      name: "Maria",
      jobTitle: "Flight Instructor",
      description:
        "FAA-certified flight instructor (CFI, CFII) at Merlin Flight Training. Specializes in Private Pilot and Instrument Rating training at Republic Airport (FRG), Farmingdale, NY.",
      worksFor: flightSchoolRef,
      affiliation: flightSchoolRef,
      knowsAbout: [
        "Flight Instruction",
        "Private Pilot Training",
        "Instrument Rating Training",
      ],
      hasCredential: [
        {
          "@type": "EducationalOccupationalCredential",
          credentialCategory: "certification",
          name: "Certified Flight Instructor (CFI)",
          recognizedBy: { "@type": "Organization", name: "Federal Aviation Administration" },
        },
        {
          "@type": "EducationalOccupationalCredential",
          credentialCategory: "certification",
          name: "Certified Flight Instructor – Instrument (CFII)",
          recognizedBy: { "@type": "Organization", name: "Federal Aviation Administration" },
        },
      ],
    },
  ],
}

export default function InstructorsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(instructorsSchema) }}
      />
      {children}
    </>
  )
}
