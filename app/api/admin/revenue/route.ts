import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service-role key for server-side operations; RLS still applies via auth context
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getAuthedAdminClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return { supabase, user }
}

// GET — fetch all revenue entries (optionally filter by ?stream=)
export async function GET(request: NextRequest) {
  const auth = await getAuthedAdminClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const stream = searchParams.get('stream')

  let query = auth.supabase
    .from('revenue_entries')
    .select('*')
    .order('date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (stream) {
    query = query.eq('stream', stream)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entries: data })
}

// POST — create or bulk-upsert entries
// Body: { entries: [{ stream, date?, data }] } or single { stream, date?, data }
export async function POST(request: NextRequest) {
  const auth = await getAuthedAdminClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const entries = body.entries || [body]

  const rows = entries.map((e: { stream: string; date?: string; data: Record<string, string> }) => ({
    stream: e.stream,
    date: e.date || null,
    data: e.data,
    created_by: auth.user.id,
  }))

  const { data, error } = await auth.supabase
    .from('revenue_entries')
    .insert(rows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data }, { status: 201 })
}

// PUT — update a single entry by id
// Body: { id, date?, data }
export async function PUT(request: NextRequest) {
  const auth = await getAuthedAdminClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, date, data: rowData } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (date !== undefined) update.date = date || null
  if (rowData !== undefined) update.data = rowData

  const { data, error } = await auth.supabase
    .from('revenue_entries')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

// DELETE — remove entry by id (?id=...)
export async function DELETE(request: NextRequest) {
  const auth = await getAuthedAdminClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await auth.supabase
    .from('revenue_entries')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
