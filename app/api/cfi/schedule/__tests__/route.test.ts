import { NextRequest } from 'next/server'

// Mock supabase and auth
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: jest.fn() }, from: jest.fn() } }))
jest.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: jest.fn() }))

describe('GET /api/cfi/schedule', () => {
  it('returns 401 when no auth header provided', async () => {
    // STUB — will fail until route.ts is implemented
    const { GET } = await import('../route')
    const req = new NextRequest('http://localhost/api/cfi/schedule')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns only bookings for students assigned to the calling CFI', async () => {
    // STUB — will fail until route.ts is implemented
    expect(true).toBe(false) // RED — force failure
  })

  it('filters bookings to pending, confirmed, completed within 7-day window', async () => {
    expect(true).toBe(false) // RED
  })
})
