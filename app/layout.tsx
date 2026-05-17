import "./globals.css"
import Footer from "./components/Footer"
import SimpleHeader from "./components/SimpleHeader"
import type React from "react"
import { AuthProvider } from "./contexts/AuthContext"
import type { Metadata, Viewport } from "next"
export const metadata: Metadata = {
  metadataBase: new URL("https://merlinflighttraining.com"),
  title: "Merlin Flight Training | Philadelphia Flight School at KPNE (Northeast Philadelphia Airport)",
  description: "FAA-certified flight training at Northeast Philadelphia Airport (KPNE). Private pilot, instrument rating, and discovery flights in a Grumman Cheetah AA-5A. 1-on-1 instruction with CFII Isaac Prestwich. Serving Philadelphia, Bucks County, Montgomery County & South Jersey.",
  keywords: [
    "Philadelphia flight school",
    "flight school Philadelphia",
    "flight school near me Philadelphia",
    "KPNE flight school",
    "Northeast Philadelphia Airport flight training",
    "flight training Philadelphia PA",
    "private pilot license Philadelphia",
    "discovery flight Philadelphia",
    "CFI Philadelphia",
    "flight instructor Philadelphia",
    "learn to fly Philadelphia",
    "Bucks County flight school",
    "Montgomery County flight training",
    "Grumman Cheetah training",
    "instrument rating Philadelphia",
  ],
  authors: [{ name: "Merlin Flight Training" }],
  creator: "Merlin Flight Training",
  publisher: "Merlin Flight Training",
  alternates: {
    canonical: "https://merlinflighttraining.com",
  },
  icons: {
    icon: [
      { url: "/icon", type: "image/png", sizes: "32x32" },
      { url: "/favicon.png", type: "image/png", sizes: "2048x2048" },
    ],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
    shortcut: [{ url: "/favicon.png", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://merlinflighttraining.com",
    siteName: "Merlin Flight Training",
    title: "Merlin Flight Training | Philadelphia Flight School at KPNE",
    description: "FAA-certified flight training at Northeast Philadelphia Airport (KPNE). Private pilot, instrument rating, and discovery flights in a Grumman Cheetah AA-5A. Serving Philadelphia, Bucks County, Montgomery County & South Jersey.",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Merlin Flight Training — Philadelphia flight school at KPNE",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Merlin Flight Training | Philadelphia Flight School · KPNE",
    description: "FAA-certified flight training at Northeast Philadelphia Airport. Discovery flights, Private Pilot, Instrument Rating in a Grumman Cheetah.",
    images: ["/images/merlin-og-image.jpg"],
    creator: "@merlinflight",
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Merlin Flight",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Merlin Flight Training",
    description: "FAA-certified flight training at Northeast Philadelphia Airport (KPNE). 1-on-1 instruction in a Grumman Cheetah AA-5A.",
    url: "https://merlinflighttraining.com",
    telephone: "+1-929-487-4717",
    image: "https://merlinflighttraining.com/merlin-logo.png",
    logo: {
      "@type": "ImageObject",
      url: "https://merlinflighttraining.com/merlin-logo.png",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "9800 Ashton Rd",
      addressLocality: "Philadelphia",
      addressRegion: "PA",
      postalCode: "19114",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.0820,
      longitude: -75.0107,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "07:00",
      closes: "20:00",
    },
    priceRange: "$$",
    areaServed: [
      { "@type": "City", name: "Philadelphia", containedIn: "Pennsylvania" },
      { "@type": "AdministrativeArea", name: "Bucks County" },
      { "@type": "AdministrativeArea", name: "Montgomery County" },
      { "@type": "City", name: "Doylestown" },
      { "@type": "City", name: "Cherry Hill", containedIn: "New Jersey" },
    ],
    containedInPlace: {
      "@type": "Airport",
      name: "Northeast Philadelphia Airport",
      iataCode: "PNE",
      address: {
        "@type": "PostalAddress",
        streetAddress: "9800 Ashton Rd",
        addressLocality: "Philadelphia",
        addressRegion: "PA",
        postalCode: "19114",
      },
    },
    sameAs: [
      "https://www.facebook.com/people/Merlin-Flight-Training/61584960395153",
      "https://www.instagram.com/merlinflighttraining",
      "https://www.linkedin.com/company/merlin-flight-training",
      "https://www.youtube.com/@MerlinFlightTraining",
      "https://www.tiktok.com/@isaacthecfi",
    ],
    services: [
      {
        "@type": "Service",
        name: "Private Pilot Training",
        description: "FAA-certified private pilot certification training",
      },
      {
        "@type": "Service",
        name: "Instrument Pilot Training",
        description: "Advanced instrument rating training",
      },
      {
        "@type": "Service",
        name: "Commercial Pilot Training",
        description: "Commercial pilot certification training",
      },
      {
        "@type": "Service",
        name: "Discovery Flights",
        description: "Introductory flight experience",
      },
    ],
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          <SimpleHeader />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
