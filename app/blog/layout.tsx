import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Flight Blog | Tips & News | Merlin Flight Training",
  description: "Read articles about flight training, aviation tips, flying techniques, and industry news from Merlin Flight Training.",
  openGraph: {
    title: "Flight Blog | Merlin Flight Training",
    description: "Articles about flight training and aviation",
    url: "https://merlinflight.com/blog",
    type: "website",
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
