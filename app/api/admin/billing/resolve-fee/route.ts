import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabaseAdmin = getSupabaseAdmin()

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { flagId } = body

  if (!flagId || typeof flagId !== 'string') {
    return NextResponse.json({ error: 'flagId is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('cancellation_fee_flags')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', flagId)

  if (error) {
    return NextResponse.json({ error: 'Failed to resolve fee' }, { status: 500 })
  }

  return NextResponse.json({ resolved: true }, { status: 200 })
}
