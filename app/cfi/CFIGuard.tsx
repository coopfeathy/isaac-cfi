'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'

export default function CFIGuard({ children }: { children: React.ReactNode }) {
  const { user, isCFI, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    } else if (!loading && user && !isCFI) {
      router.replace('/dashboard')
    }
  }, [loading, user, isCFI, router])

  if (loading || !user || !isCFI) return null

  return <>{children}</>
}
