/**
 * Tests for T05 — Admin Slot Requests (extended GET with filters)
 * app/api/admin/slot-requests/route.ts
 */

import { NextRequest } from 'next/server'

// --- Mocks ---

const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockAdminFrom = jest.fn()

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  }),
}))

import { GET } from '../route'

// --- Helpers ---

function makeRequest(url: string, method = 'GET', headers: Record<string, string> = {}) {
  return new NextRequest(url, { method, headers: { authorization: 'Bearer test-token', ...headers } })
}

function mockAdminAuth() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
  mockFrom.mockReturnValue({
    select: () => ({ eq: () => ({ single: () => ({ data: { is_admin: true } }) }) }),
  })
}

function mockNonAdminAuth() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockReturnValue({
    select: () => ({ eq: () => ({ single: () => ({ data: { is_admin: false } }) }) }),
  })
}

function chainBuilder(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.order = jest.fn().mockReturnValue(chain)
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: unknown) => void) => resolve(finalResult),
    writable: true,
    configurable: true,
  })
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ============================================================
// GET /api/admin/slot-requests
// ============================================================
describe('GET /api/admin/slot-requests', () => {
  it('returns 401 without auth header', async () => {
    const req = new NextRequest('http://localhost/api/admin/slot-requests', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockNonAdminAuth()
    const res = await GET(makeRequest('http://localhost/api/admin/slot-requests'))
    expect(res.status).toBe(403)
  })

  it('returns all slot requests ordered by created_at DESC', async () => {
    mockAdminAuth()
    const rows = [
      { id: 'req-2', status: 'pending', created_at: '2026-04-15T10:00:00Z' },
      { id: 'req-1', status: 'approved', created_at: '2026-04-10T10:00:00Z' },
    ]
    const chain = chainBuilder({ data: rows, error: null })
    mockAdminFrom.mockReturnValue(chain)

    const res = await GET(makeRequest('http://localhost/api/admin/slot-requests'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.requests).toEqual(rows)
  })

  it('filters by status query param', async () => {
    mockAdminAuth()
    const rows = [{ id: 'req-1', status: 'pending' }]
    const chain = chainBuilder({ data: rows, error: null })
    mockAdminFrom.mockReturnValue(chain)

    const res = await GET(makeRequest('http://localhost/api/admin/slot-requests?status=pending'))
    expect(res.status).toBe(200)
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending')
  })

  it('filters by request_type query param', async () => {
    mockAdminAuth()
    const rows = [{ id: 'req-1', request_type: 'training' }]
    const chain = chainBuilder({ data: rows, error: null })
    mockAdminFrom.mockReturnValue(chain)

    const res = await GET(makeRequest('http://localhost/api/admin/slot-requests?request_type=training'))
    expect(res.status).toBe(200)
    expect(chain.eq).toHaveBeenCalledWith('request_type', 'training')
  })

  it('filters by both status and request_type', async () => {
    mockAdminAuth()
    const chain = chainBuilder({ data: [], error: null })
    mockAdminFrom.mockReturnValue(chain)

    const res = await GET(makeRequest('http://localhost/api/admin/slot-requests?status=pending&request_type=training'))
    expect(res.status).toBe(200)
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending')
    expect(chain.eq).toHaveBeenCalledWith('request_type', 'training')
  })
})
