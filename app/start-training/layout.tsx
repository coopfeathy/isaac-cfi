import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Start Your Flight Training | Merlin Flight Training",
  description:
    "You've flown with us — now make it official. Book your first lesson and complete the four requirements to begin training at Merlin Flight Training.",
  alternates: {
    canonical: "/start-training",
  },
}

export default function StartTrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
