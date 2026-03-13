import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Learn - Merlin Flight Training",
  description: "Access flight training courses and lessons",
}

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
