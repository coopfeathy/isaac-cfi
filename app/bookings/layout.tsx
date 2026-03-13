import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
