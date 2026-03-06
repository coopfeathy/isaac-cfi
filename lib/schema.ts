// Structured Data (JSON-LD) Generators for SEO
// These help search engines understand your content better

export interface SchemaOrganization {
  name: string
  url: string
  logo?: string
  description?: string
  sameAs?: string[]
  address?: {
    streetAddress: string
    addressLocality: string
    addressRegion: string
    postalCode: string
    addressCountry: string
  }
}

export interface SchemaPerson {
  name: string
  jobTitle: string
  description?: string
  image?: string
  url?: string
}

export interface SchemaService {
  name: string
  description: string
  provider?: string
  areaServed?: string | string[]
  price?: string
  priceCurrency?: string
}

export interface SchemaEvent {
  name: string
  description: string
  startDate: string
  endDate?: string
  eventStatus?: string
  eventAttendanceMode?: string
  location?: {
    name: string
    address: string
  }
  organizer?: {
    name: string
    url: string
  }
}

export function generateOrganizationSchema(
  org: SchemaOrganization
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    ...org,
  }
}

export function generatePersonSchema(person: SchemaPerson): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    ...person,
  }
}

export function generateServiceSchema(
  service: SchemaService
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    ...service,
  }
}

export function generateEventSchema(event: SchemaEvent): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    ...event,
  }
}

export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

export function generatePriceSchema(
  offer: {
    name: string
    description: string
    priceLow: string
    priceHigh: string
    priceCurrency: string
    availability: string
  }
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "AggregateOffer",
    ...offer,
  }
}

// Structured data for blog articles
export function generateArticleSchema(
  article: {
    headline: string
    description: string
    image?: string
    datePublished: string
    dateModified?: string
    author: string
    content: string
  }
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    ...article,
  }
}
