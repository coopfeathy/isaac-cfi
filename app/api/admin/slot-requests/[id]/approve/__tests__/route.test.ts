/**
 * Tests for T05 — Admin Approve Slot Request
 * app/api/admin/slot-requests/[id]/approve/route.ts
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

import { POST as _POST } from '../route'
const POST = _POST as (...args: any[]) => Promise<Response>

// --- Helpers ---

function makeRequest(body?: unknown, headers: Record<string, string> = {}) {
  const init: RequestInit = {
    method: 'POST',
    headers: { authorization: 'Bearer test-token', ...headers },
  }
  if (body) init.body = JSON.stringify(body)
  return new NextRequest('http://localhost/api/admin/slot-requests/req-1/approve', init as any)
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
  chain.insert = jest.fn().mockReturnValue(chain)
  chain.update = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.neq = jest.fn().mockReturnValue(chain)
  chain.lt = jest.fn().mockReturnValue(chain)
  chain.gt = jest.fn().mockReturnValue(chain)
  chain.lte = jest.fn().mockReturnValue(chain)
  chain.gte = jest.fn().mockReturnValue(chain)
  chain.order = jest.fn().mockReturnValue(chain)
  chain.single = jest.fn().mockResolvedValue(finalResult)
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: unknown) => void) => resolve(finalResult),
    writable: true,
    configurable: true,
  })
  return chain
}

const contextParams = { params: Promise.resolve({ id: 'req-1' }) }

beforeEach(() => {
  jest.clearAllMocks()
})

// ============================================================
// POST /api/admin/slot-requests/[id]/approve
// ============================================================
describe('POST /api/admin/slot-requests/[id]/approve', () => {
  it('returns 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/admin/slot-requests/req-1/approve', { method: 'POST', body: '{}' })
    const res = await POST(req, contextParams)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    mockNonAdminAuth()
    const res = await POST(makeRequest({}), contextParams)
    expect(res.status).toBe(403)
  })

  it('returns 404 ERR_REQ_004 when request not found', async () => {
    mockAdminAuth()
    const lookupChain = chainBuilder({ data: null, error: { message: 'not found' } })
    mockAdminFrom.mockReturnValueOnce(lookupChain)

    const res = await POST(makeRequest({}), contextParams)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('ERR_REQ_004')
  })

  it('returns 404 ERR_REQ_004 when request already resolved', async () => {
    mockAdminAuth()
    const lookupChain = chainBuilder({
      data: {
        id: 'req-1',
        status: 'approved',
        preferred_start_time: '2026-04-15T10:00:00Z',
        preferred_end_time: '2026-04-15T11:30:00Z',
      },
      error: null,
    })
    mockAdminFrom.mockReturnValueOnce(lookupChain)

    const res = await POST(makeRequest({}), contextParams)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('ERR_REQ_004')
  })

  it('returns 409 ERR_REQ_003 when time conflicts with another approved request', async () => {
    mockAdminAuth()
    // Lookup returns pending request
    const lookupChain = chainBuilder({
      data: {
        id: 'req-1',
        status: 'pending',
        preferred_start_time: '2026-04-15T10:00:00Z',
        preferred_end_time: '2026-04-15T11:30:00Z',
      },
      error: null,
    })
    // Conflict check returns overlapping approved request
    const conflictChain = chainBuilder({ data: [{ id: 'req-other' }], error: null })
    mockAdminFrom
      .mockReturnValueOnce(lookupChain)
      .mockReturnValueOnce(conflictChain)

    const res = await POST(makeRequest({ decision_notes: 'Looks good' }), contextParams)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe('ERR_REQ_003')
  })

  it('approves request successfully', async () => {
    mockAdminAuth()
    const pendingReq = {
      id: 'req-1',
      status: 'pending',
      preferred_start_time: '2026-04-15T10:00:00Z',
      preferred_end_time: '2026-04-15T11:30:00Z',
    }
    const lookupChain = chainBuilder({ data: pendingReq, error: null })
    // Conflict check — no conflicts
    const conflictChain = chainBuilder({ data: [], error: null })
    // Update chain
    const updatedReq = { ...pendingReq, status: 'approved', resolved_by: 'admin-1' }
    const updateChain = chainBuilder({ data: updatedReq, error: null })
    mockAdminFrom
      .mockReturnValueOnce(lookupChain)
      .mockReturnValueOnce(conflictChain)
      .mockReturnValueOnce(updateChain)

    const res = await POST(makeRequest({ decision_notes: 'Approved!' }), contextParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.request.status).toBe('approved')
  })
})
