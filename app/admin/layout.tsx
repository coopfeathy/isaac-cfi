import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin - Merlin Flight Training",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
