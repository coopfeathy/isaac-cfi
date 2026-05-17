import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Contact & Support | Merlin Flight Training",
  description: "Get in touch with Merlin Flight Training. Questions about flight lessons, scheduling, or pricing at Northeast Philadelphia Airport (KPNE), Philadelphia, PA? We're here to help.",
  openGraph: {
    title: "Contact | Merlin Flight Training",
    description: "Reach out to Merlin Flight Training — Northeast Philadelphia Airport (KPNE), Philadelphia, PA.",
    url: "https://merlinflighttraining.com/support",
    type: "website",
  },
  alternates: {
    canonical: "https://merlinflighttraining.com/support",
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
