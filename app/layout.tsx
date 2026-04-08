import "./globals.css"
import Footer from "./components/Footer"
import SimpleHeader from "./components/SimpleHeader"
import type React from "react"
import { AuthProvider } from "./contexts/AuthContext"
import type { Metadata, Viewport } from "next"
export const metadata: Metadata = {
  metadataBase: new URL("https://merlinflight.com"),
  title: "Merlin Flight Training | Flight School Near NYC – Republic Airport FRG",
  description: "FAA-certified flight training at Republic Airport (FRG), Farmingdale, NY. Private pilot, instrument rating, commercial certifications & discovery flights. Serving Long Island, NYC & New Jersey. Book today.",
  keywords: [
    "flight training Long Island",
    "flight school near NYC",
    "pilot training Farmingdale NY",
    "discovery flight Republic Airport",
    "learn to fly FRG",
    "private pilot license New York",
    "CFI Long Island",
    "flight lessons near me",
    "FAA certified flight instructor",
    "instrument rating New York",
    "commercial pilot training NYC",
    "flight school Farmingdale",
  ],
  authors: [{ name: "Merlin Flight Training" }],
  creator: "Merlin Flight Training",
  publisher: "Merlin Flight Training",
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
    url: "https://merlinflight.com",
    siteName: "Merlin Flight Training",
    title: "Merlin Flight Training | Flight School Near NYC – Republic Airport",
    description: "FAA-certified flight training at Republic Airport (FRG), Farmingdale, NY. Private pilot, instrument rating, commercial certifications & discovery flights serving Long Island, NYC & New Jersey.",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Merlin Flight Training - Professional Flight Training in NYC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Merlin Flight Training | NYC Pilot Training",
    description: "Professional FAA-certified flight training in NYC and New Jersey.",
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
    description: "Professional FAA-certified flight training in NYC and New Jersey",
    url: "https://merlinflight.com",
    telephone: "+1-929-487-4717",
    image: "https://merlinflight.com/images/merlin-logo.png",
    address: {
      "@type": "PostalAddress",
      streetAddress: "208 NY-109",
      addressLocality: "Farmingdale",
      addressRegion: "NY",
      postalCode: "11735",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.7285,
      longitude: -73.4134,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "07:00",
      closes: "20:00",
    },
    priceRange: "$$",
    areaServed: [
      { "@type": "City", name: "Farmingdale", containedIn: "New York" },
      { "@type": "City", name: "New York City" },
      { "@type": "City", name: "Long Island" },
      { "@type": "City", name: "Newark", containedIn: "New Jersey" },
    ],
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

