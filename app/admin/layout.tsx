import type { Metadata } from "next"

import AdminTopNav from "@/app/components/AdminTopNav"

export const metadata: Metadata = {
  title: "Admin - Merlin Flight Training",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminTopNav />
      <main className="lg:pl-24 xl:pl-72">{children}</main>
    </div>
  )
}
