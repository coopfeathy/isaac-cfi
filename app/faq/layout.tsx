import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Merlin Flight Training",
  description: "Find answers to common questions about flight training, certifications, requirements, and our programs.",
  openGraph: {
    title: "FAQs | Merlin Flight Training",
    description: "Answers to common questions about our flight training programs",
    url: "https://merlinflight.com/faq",
    type: "website",
  },
}

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
