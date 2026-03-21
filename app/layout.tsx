import "./globals.css"
import Footer from "./components/Footer"
import SimpleHeader from "./components/SimpleHeader"
import type React from "react"
import { AuthProvider } from "./contexts/AuthContext"
import type { Metadata, Viewport } from "next"
export const metadata: Metadata = {
  metadataBase: new URL("https://merlinflight.com"),
  title: "Merlin Flight Training | NYC Pilot Training & Flight Lessons",
  description: "Professional FAA-certified flight training in NYC and New Jersey. Private pilot, instrument rating, and commercial certifications. Book your discovery flight today.",
  keywords: ["flight training", "pilot training", "NYC", "New Jersey", "discovery flight", "flight lessons", "FAA certified instructor"],
  authors: [{ name: "Merlin Flight Training" }],
  creator: "Merlin Flight Training",
  publisher: "Merlin Flight Training",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://merlinflight.com",
    siteName: "Merlin Flight Training",
    title: "Merlin Flight Training | Professional Pilot Training",
    description: "FAA-certified flight training with experienced instructors. Private, instrument, and commercial pilot certifications.",
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
    telephone: "+1-XXX-XXX-XXXX",
    image: "https://merlinflight.com/images/merlin-logo.png",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Flying W Airport, N14",
      addressLocality: "Lumberton",
      addressRegion: "NJ",
      postalCode: "08048",
      addressCountry: "US",
    },
    areaServed: [
      {
        "@type": "State",
        name: "New Jersey",
      },
      {
        "@type": "State",
        name: "New York",
      },
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

