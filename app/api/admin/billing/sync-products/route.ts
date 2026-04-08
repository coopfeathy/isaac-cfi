import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type ItemRow = {
  id: string
  name: string
  type: string
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })
  : null

async function resolveUnitAmount(stripeClient: Stripe, product: Stripe.Product): Promise<number | null> {
  if (product.default_price && typeof product.default_price === 'object') {
    return typeof product.default_price.unit_amount === 'number'
      ? product.default_price.unit_amount
      : null
  }

  if (typeof product.default_price === 'string') {
    try {
      const price = await stripeClient.prices.retrieve(product.default_price)
      return typeof price.unit_amount === 'number' ? price.unit_amount : null
    } catch {
      return null
    }
  }

  const prices = await stripeClient.prices.list({ product: product.id, active: true, limit: 1 })
  const first = prices.data[0]
  return first && typeof first.unit_amount === 'number' ? first.unit_amount : null
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: existingItems, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('id, name, type')

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 })
    }

    const itemRows = (existingItems || []) as ItemRow[]
    const existingByKey = new Map(
      itemRows.map((item) => [`${item.name.trim().toLowerCase()}::${item.type.trim().toLowerCase()}`, item])
    )

    const productList = await stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] })

    let created = 0
    let updated = 0
    let skipped = 0
    const skippedProducts: string[] = []

    for (const product of productList.data) {
      const unitAmount = await resolveUnitAmount(stripe, product)
      const type = String(product.metadata?.type || 'training').trim().toLowerCase() || 'training'
      const name = product.name.trim()

      if (!name) {
        skipped += 1
        continue
      }

      if (unitAmount === null) {
        skipped += 1
        skippedProducts.push(`${name} (no active unit price)`)
        continue
      }

      const key = `${name.toLowerCase()}::${type}`
      const existing = existingByKey.get(key)

      if (existing) {
        const { error: updateError } = await supabaseAdmin
          .from('items')
          .update({
            description: product.description || null,
            rate_cents: unitAmount,
            is_active: true,
            type,
          })
          .eq('id', existing.id)

        if (updateError) {
          skipped += 1
          skippedProducts.push(`${name} (${updateError.message})`)
          continue
        }

        updated += 1
        continue
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('items')
        .insert([
          {
            name,
            description: product.description || null,
            type,
            rate_cents: unitAmount,
            is_active: true,
          },
        ])
        .select('id, name, type')
        .single()

      if (insertError || !inserted) {
        skipped += 1
        skippedProducts.push(`${name} (${insertError?.message || 'insert failed'})`)
        continue
      }

      existingByKey.set(key, inserted as ItemRow)
      created += 1
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      skippedProducts,
      totalProductsScanned: productList.data.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
