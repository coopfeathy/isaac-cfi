/**
 * Tests for T03 — Public Availability API
 * app/api/availability/route.ts
 */

import { NextRequest } from 'next/server'

const mockGetUser = jest.fn()
const mockAdminFrom = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  },
}))

jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  }),
}))

import { GET } from '../route'

function chainBuilder(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.gte = jest.fn().mockReturnValue(chain)
  chain.lte = jest.fn().mockReturnValue(chain)
  chain.order = jest.fn().mockReturnValue(chain)
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: unknown) => void) => resolve(finalResult),
    writable: true,
    configurable: true,
  })
  return chain
}

beforeEach(() => jest.clearAllMocks())

describe('GET /api/availability', () => {
  it('returns 401 without auth header', async () => {
    const req = new NextRequest('http://localhost/api/availability?week=2026-04-06')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for invalid token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } })
    const req = new NextRequest('http://localhost/api/availability?week=2026-04-06', {
      headers: { authorization: 'Bearer bad-token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 without week param', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const req = new NextRequest('http://localhost/api/availability', {
      headers: { authorization: 'Bearer good-token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('week')
  })

  it('returns 400 for invalid week format', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const req = new NextRequest('http://localhost/api/availability?week=not-a-date', {
      headers: { authorization: 'Bearer good-token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns template and overrides for a valid week', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const templateRows = [
      { id: '1', day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_active: true },
    ]
    const overrideRows = [
      { id: '2', override_date: '2026-04-07', is_available: false },
    ]

    const templateChain = chainBuilder({ data: templateRows, error: null })
    const overrideChain = chainBuilder({ data: overrideRows, error: null })

    mockAdminFrom
      .mockReturnValueOnce(templateChain)
      .mockReturnValueOnce(overrideChain)

    const req = new NextRequest('http://localhost/api/availability?week=2026-04-06', {
      headers: { authorization: 'Bearer good-token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.template).toEqual(templateRows)
    expect(json.overrides).toEqual(overrideRows)
  })
})
