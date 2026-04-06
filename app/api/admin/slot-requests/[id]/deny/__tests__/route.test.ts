/**
 * Tests for T05 — Admin Deny Slot Request
 * app/api/admin/slot-requests/[id]/deny/route.ts
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

import { POST } from '../route'

// --- Helpers ---

function makeRequest(body?: unknown, headers: Record<string, string> = {}) {
  const init: RequestInit = {
    method: 'POST',
    headers: { authorization: 'Bearer test-token', ...headers },
  }
  if (body) init.body = JSON.stringify(body)
  return new NextRequest('http://localhost/api/admin/slot-requests/req-1/deny', init)
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
  chain.update = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
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
// POST /api/admin/slot-requests/[id]/deny
// ============================================================
describe('POST /api/admin/slot-requests/[id]/deny', () => {
  it('returns 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/admin/slot-requests/req-1/deny', { method: 'POST', body: JSON.stringify({ denial_reason: 'x' }) })
    const res = await POST(req, contextParams)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    mockNonAdminAuth()
    const res = await POST(makeRequest({ denial_reason: 'Schedule full' }), contextParams)
    expect(res.status).toBe(403)
  })

  it('returns 400 when denial_reason is missing', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest({}), contextParams)
    expect(res.status).toBe(400)
  })

  it('returns 404 ERR_REQ_004 when request not found', async () => {
    mockAdminAuth()
    const lookupChain = chainBuilder({ data: null, error: { message: 'not found' } })
    mockAdminFrom.mockReturnValueOnce(lookupChain)

    const res = await POST(makeRequest({ denial_reason: 'No availability' }), contextParams)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('ERR_REQ_004')
  })

  it('returns 404 ERR_REQ_004 when request already resolved', async () => {
    mockAdminAuth()
    const lookupChain = chainBuilder({
      data: { id: 'req-1', status: 'denied' },
      error: null,
    })
    mockAdminFrom.mockReturnValueOnce(lookupChain)

    const res = await POST(makeRequest({ denial_reason: 'Already denied' }), contextParams)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('ERR_REQ_004')
  })

  it('denies request successfully', async () => {
    mockAdminAuth()
    const pendingReq = { id: 'req-1', status: 'pending' }
    const lookupChain = chainBuilder({ data: pendingReq, error: null })
    const updatedReq = { ...pendingReq, status: 'denied', denial_reason: 'Weather forecast', resolved_by: 'admin-1' }
    const updateChain = chainBuilder({ data: updatedReq, error: null })
    mockAdminFrom
      .mockReturnValueOnce(lookupChain)
      .mockReturnValueOnce(updateChain)

    const res = await POST(makeRequest({ denial_reason: 'Weather forecast' }), contextParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.request.status).toBe('denied')
    expect(json.request.denial_reason).toBe('Weather forecast')
  })
})
