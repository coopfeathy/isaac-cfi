import type { Metadata } from 'next'
import CFITopNav from '@/app/components/CFITopNav'
import CFIGuard from './CFIGuard'

export const metadata: Metadata = {
  title: 'CFI Workspace - Merlin Flight Training',
}

export default function CFILayout({ children }: { children: React.ReactNode }) {
  return (
    <CFIGuard>
      <div className="min-h-screen bg-slate-50">
        <CFITopNav />
        <main>{children}</main>
      </div>
    </CFIGuard>
  )
}
