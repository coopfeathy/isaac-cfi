import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const supabaseAdmin = getSupabaseAdmin()

    const [rulesResult, itemsResult] = await Promise.all([
      supabaseAdmin
        .from('stripe_connect_payout_rules')
        .select(
          'id, name, is_active, priority, source, slot_type, item_id, transaction_type, currency, destination_account, allow_developer_commission, fee_mode, fee_bps, fee_cents, created_at'
        )
        .order('priority', { ascending: true }),
      supabaseAdmin
        .from('items')
        .select('id, name')
        .eq('is_active', true),
    ])

    if (rulesResult.error) throw rulesResult.error

    const itemNameMap = new Map<string, string>()
    if (!itemsResult.error && itemsResult.data) {
      for (const item of itemsResult.data) {
        itemNameMap.set(item.id, item.name)
      }
    }

    const rules = (rulesResult.data || []).map((rule: any) => ({
      id: rule.id,
      name: rule.name,
      isActive: rule.is_active,
      priority: rule.priority,
      source: rule.source,
      slotType: rule.slot_type,
      itemId: rule.item_id,
      itemName: rule.item_id ? itemNameMap.get(rule.item_id) || null : null,
      transactionType: rule.transaction_type,
      currency: rule.currency,
      destinationAccount: rule.destination_account,
      allowDeveloperCommission: rule.allow_developer_commission,
      feeMode: rule.fee_mode,
      feeBps: rule.fee_bps,
      feeCents: rule.fee_cents,
      createdAt: rule.created_at,
    }))

    return NextResponse.json({ rules })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to load payout rules' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const body = await request.json()
    const { ruleId, updates } = body as {
      ruleId: string
      updates: {
        name?: string
        isActive?: boolean
        feeBps?: number
        feeCents?: number
        feeMode?: 'bps' | 'fixed_cents'
        allowDeveloperCommission?: boolean
        destinationAccount?: string
        priority?: number
      }
    }

    if (!ruleId || typeof ruleId !== 'string') {
      return NextResponse.json({ error: 'Missing ruleId' }, { status: 400 })
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Missing updates' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Build update payload with only allowed fields
    const dbUpdates: Record<string, any> = {}

    if (typeof updates.name === 'string') dbUpdates.name = updates.name
    if (typeof updates.isActive === 'boolean') dbUpdates.is_active = updates.isActive
    if (typeof updates.feeMode === 'string' && ['bps', 'fixed_cents'].includes(updates.feeMode)) {
      dbUpdates.fee_mode = updates.feeMode
    }
    if (typeof updates.feeBps === 'number') {
      if (updates.feeBps < 0 || updates.feeBps > 10000) {
        return NextResponse.json({ error: 'feeBps must be between 0 and 10000' }, { status: 400 })
      }
      dbUpdates.fee_bps = Math.round(updates.feeBps)
    }
    if (typeof updates.feeCents === 'number') {
      if (updates.feeCents < 0) {
        return NextResponse.json({ error: 'feeCents must be >= 0' }, { status: 400 })
      }
      dbUpdates.fee_cents = Math.round(updates.feeCents)
    }
    if (typeof updates.allowDeveloperCommission === 'boolean') {
      dbUpdates.allow_developer_commission = updates.allowDeveloperCommission
    }
    if (typeof updates.destinationAccount === 'string' && updates.destinationAccount.startsWith('acct_')) {
      dbUpdates.destination_account = updates.destinationAccount
    }
    if (typeof updates.priority === 'number') {
      dbUpdates.priority = Math.round(updates.priority)
    }

    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('stripe_connect_payout_rules')
      .update(dbUpdates)
      .eq('id', ruleId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to update payout rule' }, { status: 500 })
  }
}
