'use client'

import ManageSidebar from '../components/ManageSidebar'

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <ManageSidebar />
      <main style={{
        marginLeft: '280px',
        flex: 1,
        padding: '32px',
        width: 'calc(100% - 280px)'
      }}>
        {children}
      </main>
    </div>
  )
}
