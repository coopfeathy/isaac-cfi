import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Flight Blog | Tips & News | Merlin Flight Training",
  description: "Read articles about flight training, aviation tips, flying techniques, and industry news from Merlin Flight Training.",
  alternates: {
    canonical: "https://merlinflighttraining.com/blog",
  },
  openGraph: {
    title: "Flight Blog | Merlin Flight Training",
    description: "Articles about flight training and aviation",
    url: "https://merlinflighttraining.com/blog",
    type: "website",
    images: [
      {
        url: "/images/merlin-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Merlin Flight Training – Flight Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flight Blog | Merlin Flight Training",
    description: "Articles about flight training and aviation tips.",
    images: ["/images/merlin-og-image.jpg"],
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
