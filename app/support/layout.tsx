import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Contact & Support | Merlin Flight Training",
  description: "Get in touch with Merlin Flight Training. Questions about flight lessons, scheduling, or pricing at Republic Airport (FRG), Farmingdale, NY? We're here to help.",
  openGraph: {
    title: "Contact | Merlin Flight Training",
    description: "Reach out to Merlin Flight Training — Republic Airport (FRG), Farmingdale, NY.",
    url: "https://merlinflight.com/support",
    type: "website",
  },
  alternates: {
    canonical: "https://merlinflight.com/support",
  },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
