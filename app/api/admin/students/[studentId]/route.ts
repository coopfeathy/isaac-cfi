import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type RouteContext = {
  params: {
    studentId: string
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const studentId = context.params.studentId
    if (!studentId) {
      return NextResponse.json({ error: 'Missing student id' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const preferredCurrency = typeof body.preferredCurrency === 'string' ? body.preferredCurrency.trim().toLowerCase() : null
    const trainingItemIds = Array.isArray(body.trainingItemIds)
      ? body.trainingItemIds.filter((id: unknown) => typeof id === 'string' && id.length > 0)
      : null
    const stripeCustomerId = typeof body.stripeCustomerId === 'string' ? body.stripeCustomerId.trim() : null

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (preferredCurrency !== null) {
      if (!/^[a-z]{3}$/.test(preferredCurrency)) {
        return NextResponse.json({ error: 'Currency must be a 3-letter ISO code' }, { status: 400 })
      }
      updatePayload.preferred_currency = preferredCurrency
    }

    if (trainingItemIds !== null) {
      updatePayload.training_item_ids = trainingItemIds
    }

    if (stripeCustomerId !== null) {
      updatePayload.stripe_customer_id = stripeCustomerId || null
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('students')
      .update(updatePayload)
      .eq('id', studentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
