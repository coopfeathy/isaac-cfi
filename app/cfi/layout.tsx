import type { Metadata } from 'next'
import '@/app/admin/ops-console/ops-console.css'
import './cfi-ops.css'
import CFIOpsShell from '@/app/components/CFIOpsShell'
import CFIGuard from './CFIGuard'

export const metadata: Metadata = {
  title: 'CFI Workspace - Merlin Flight Training',
}

export default function CFILayout({ children }: { children: React.ReactNode }) {
  return (
    <CFIGuard>
      <CFIOpsShell>{children}</CFIOpsShell>
    </CFIGuard>
  )
}
