import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) }
  }

  return { user }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const body = await request.json().catch(() => ({}))
    const studentId = typeof body.studentId === 'string' ? body.studentId : ''
    const amountDollars = Number(body.amountDollars)
    const note = typeof body.note === 'string' ? body.note.trim() : ''

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
      return NextResponse.json({ error: 'amountDollars must be greater than 0' }, { status: 400 })
    }

    const amountCents = Math.round(amountDollars * 100)
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'amountDollars is too small' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, user_id, full_name')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const description = [
      `CASH: Cash payment recorded in admin billing`,
      `Student:${student.full_name || 'Student'}`,
      note ? `Note:${note}` : null,
    ]
      .filter(Boolean)
      .join(' | ')

    const { error: transactionError } = await supabaseAdmin.from('transactions').insert([
      {
        user_id: student.user_id || null,
        amount_cents: amountCents,
        type: 'charge',
        description,
        created_by: adminCheck.user.id,
      },
    ])

    if (transactionError) {
      return NextResponse.json({ error: transactionError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      amountCents,
      studentId: student.id,
      userId: student.user_id,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request)
    if ('error' in adminCheck) return adminCheck.error

    const body = await request.json().catch(() => ({}))
    const transactionId = typeof body.transactionId === 'string' ? body.transactionId : ''
    const studentId = typeof body.studentId === 'string' ? body.studentId : ''

    if (!transactionId || !studentId) {
      return NextResponse.json({ error: 'transactionId and studentId are required' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id, description')
      .eq('id', transactionId)
      .single()

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const desc = (transaction.description || '') as string
    const isCash =
      desc.startsWith('CASH:') ||
      desc.startsWith('[CASH]') ||
      desc.startsWith('Partial cash payment')

    if (!isCash) {
      return NextResponse.json({ error: 'Transaction is not a cash payment' }, { status: 400 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', transactionId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
