/**
 * Canonical auth guard functions for API route handlers.
 *
 * Import these instead of copy-pasting the pattern across route files.
 * Each function validates the Bearer token via supabase.auth.getUser()
 * (server-verified — NOT getSession() which only reads cookies).
 *
 * Usage:
 *   const adminCheck = await requireAdmin(request)
 *   if ('error' in adminCheck) return adminCheck.error
 *   const { user, profile } = adminCheck
 */

import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Require the caller to be an authenticated admin user.
 *
 * Returns { error: NextResponse } with:
 *   - 401 if no Authorization header or invalid/expired token
 *   - 403 if the user exists but is_admin is false
 *
 * Returns { user, profile } on success.
 */
export async function requireAdmin(request: NextRequest) {
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

  return { user, profile }
}

/**
 * Require the caller to be an authenticated CFI (instructor) or admin.
 *
 * Admin is a superset of CFI — any admin passes this check (D-02).
 *
 * Returns { error: NextResponse } with:
 *   - 401 if no Authorization header or invalid/expired token
 *   - 403 if the user is neither an instructor nor an admin
 *
 * Returns { user, profile } on success.
 */
export async function requireCFI(request: NextRequest) {
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
    .select('is_admin, is_instructor')
    .eq('id', user.id)
    .single()

  if (profileError || (!profile?.is_instructor && !profile?.is_admin)) {
    return { error: NextResponse.json({ error: 'CFI or admin access required' }, { status: 403 }) }
  }

  return { user, profile }
}

/**
 * Require the caller to have any valid authenticated session.
 *
 * Does NOT check profile or roles. Used for student-facing routes
 * where any logged-in user may proceed.
 *
 * Returns { error: NextResponse } with:
 *   - 401 if no Authorization header or invalid/expired token
 *
 * Returns { user } on success.
 */
export async function requireUser(request: NextRequest) {
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

  return { user }
}
