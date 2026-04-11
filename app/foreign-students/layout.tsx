import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Flight Training for Foreign Students | Merlin Flight Training",
  description:
    "Merlin Flight Training is registered with the TSA Alien Flight Student Program (AFSP) portal and is approved to train international students. Here is your step-by-step path from first email to first flight lesson.",
  alternates: {
    canonical: "/foreign-students",
  },
}

export default function ForeignStudentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
