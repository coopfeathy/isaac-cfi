import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import CFITopNav from '@/app/components/CFITopNav'

export const metadata: Metadata = {
  title: 'CFI Workspace - Merlin Flight Training',
}

export default async function CFILayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_instructor, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_instructor && !profile?.is_admin) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <CFITopNav />
      <main>{children}</main>
    </div>
  )
}
