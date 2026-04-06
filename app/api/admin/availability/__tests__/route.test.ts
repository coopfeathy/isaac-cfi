/**
 * Tests for T03 — Availability Template CRUD API
 * app/api/admin/availability/route.ts
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

import { GET as _GET, POST as _POST, PATCH as _PATCH, DELETE as _DELETE } from '../route'
type RouteHandler = (...args: any[]) => Promise<Response>
const GET = _GET as RouteHandler
const POST = _POST as RouteHandler
const PATCH = _PATCH as RouteHandler
const DELETE = _DELETE as RouteHandler

// --- Helpers ---

function makeRequest(method: string, body?: unknown, headers: Record<string, string> = {}) {
  const init: RequestInit = { method, headers: { authorization: 'Bearer test-token', ...headers } }
  if (body) init.body = JSON.stringify(body)
  return new NextRequest('http://localhost/api/admin/availability', init as any)
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

function mockNoAuth() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } })
}

// Chain builder for supabase admin queries
function chainBuilder(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  const self = () => chain
  chain.select = jest.fn().mockReturnValue(chain)
  chain.insert = jest.fn().mockReturnValue(chain)
  chain.update = jest.fn().mockReturnValue(chain)
  chain.delete = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.neq = jest.fn().mockReturnValue(chain)
  chain.lte = jest.fn().mockReturnValue(chain)
  chain.gte = jest.fn().mockReturnValue(chain)
  chain.lt = jest.fn().mockReturnValue(chain)
  chain.gt = jest.fn().mockReturnValue(chain)
  chain.order = jest.fn().mockReturnValue(chain)
  chain.single = jest.fn().mockResolvedValue(finalResult)
  // For queries that don't call .single()
  chain.then = undefined as unknown as jest.Mock
  // Make chain itself thenable for queries without .single()
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
// GET /api/admin/availability
// ============================================================
describe('GET /api/admin/availability', () => {
  it('returns 401 without auth header', async () => {
    const req = new NextRequest('http://localhost/api/admin/availability', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockNonAdminAuth()
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(403)
  })

  it('returns all availability rows ordered by day_of_week, start_time', async () => {
    mockAdminAuth()
    const rows = [
      { id: '1', day_of_week: 0, start_time: '09:00:00', end_time: '12:00:00', is_active: true },
      { id: '2', day_of_week: 1, start_time: '08:00:00', end_time: '17:00:00', is_active: true },
    ]
    const chain = chainBuilder({ data: rows, error: null })
    // Override then to resolve like a non-single query
    Object.defineProperty(chain, 'then', {
      value: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
      writable: true,
      configurable: true,
    })
    mockAdminFrom.mockReturnValue(chain)

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual(rows)
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.order).toHaveBeenCalledWith('day_of_week')
    expect(chain.order).toHaveBeenCalledWith('start_time')
  })
})

// ============================================================
// POST /api/admin/availability
// ============================================================
describe('POST /api/admin/availability', () => {
  const validBody = { day_of_week: 1, start_time: '09:00', end_time: '17:00' }

  it('returns 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/admin/availability', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid day_of_week', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { ...validBody, day_of_week: 7 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('day_of_week')
  })

  it('returns 400 for negative day_of_week', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { ...validBody, day_of_week: -1 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when start_time >= end_time', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { ...validBody, start_time: '17:00', end_time: '09:00' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('start_time must be before end_time')
  })

  it('returns 400 for missing fields', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { day_of_week: 1 }))
    expect(res.status).toBe(400)
  })

  it('returns 409 ERR_AVAIL_001 on overlapping entry', async () => {
    mockAdminAuth()
    // First call: overlap check returns existing row
    const overlapChain = chainBuilder({ data: [{ id: 'existing' }], error: null })
    Object.defineProperty(overlapChain, 'then', {
      value: (resolve: (v: unknown) => void) => resolve({ data: [{ id: 'existing' }], error: null }),
      writable: true,
      configurable: true,
    })
    mockAdminFrom.mockReturnValue(overlapChain)

    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe('ERR_AVAIL_001')
  })

  it('creates and returns the new row on success', async () => {
    mockAdminAuth()
    const createdRow = { id: 'new-1', ...validBody, is_active: true }

    // First call: overlap check (no overlaps)
    const overlapChain = chainBuilder({ data: [], error: null })
    Object.defineProperty(overlapChain, 'then', {
      value: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      writable: true,
      configurable: true,
    })
    // Second call: insert
    const insertChain = chainBuilder({ data: createdRow, error: null })

    mockAdminFrom
      .mockReturnValueOnce(overlapChain)
      .mockReturnValueOnce(insertChain)

    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data).toEqual(createdRow)
  })
})

// ============================================================
// PATCH /api/admin/availability
// ============================================================
describe('PATCH /api/admin/availability', () => {
  it('returns 400 without id', async () => {
    mockAdminAuth()
    const res = await PATCH(makeRequest('PATCH', { is_active: false }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('id is required')
  })

  it('returns 400 when updated times are invalid', async () => {
    mockAdminAuth()
    // Need to return current row for time validation
    const fetchChain = chainBuilder({
      data: { id: 'x', day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00' },
      error: null,
    })
    mockAdminFrom.mockReturnValue(fetchChain)

    const res = await PATCH(makeRequest('PATCH', { id: 'x', start_time: '18:00', end_time: '09:00' }))
    expect(res.status).toBe(400)
  })

  it('updates and returns the row on success', async () => {
    mockAdminAuth()
    const updatedRow = { id: 'x', day_of_week: 1, start_time: '10:00:00', end_time: '17:00:00', is_active: true }

    // Fetch existing row
    const fetchChain = chainBuilder({
      data: { id: 'x', day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_active: true },
      error: null,
    })
    // Overlap check (no overlaps)
    const overlapChain = chainBuilder({ data: [], error: null })
    Object.defineProperty(overlapChain, 'then', {
      value: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      writable: true,
      configurable: true,
    })
    // Update
    const updateChain = chainBuilder({ data: updatedRow, error: null })

    mockAdminFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(overlapChain)
      .mockReturnValueOnce(updateChain)

    const res = await PATCH(makeRequest('PATCH', { id: 'x', start_time: '10:00' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual(updatedRow)
  })

  it('updates is_active without time validation', async () => {
    mockAdminAuth()
    const updatedRow = { id: 'x', is_active: false }

    // No fetch needed when only toggling is_active
    const updateChain = chainBuilder({ data: updatedRow, error: null })
    mockAdminFrom.mockReturnValue(updateChain)

    const res = await PATCH(makeRequest('PATCH', { id: 'x', is_active: false }))
    expect(res.status).toBe(200)
  })
})

// ============================================================
// DELETE /api/admin/availability
// ============================================================
describe('DELETE /api/admin/availability', () => {
  it('returns 400 without id', async () => {
    mockAdminAuth()
    const res = await DELETE(makeRequest('DELETE', {}))
    expect(res.status).toBe(400)
  })

  it('deletes and returns success', async () => {
    mockAdminAuth()
    const deleteChain = chainBuilder({ data: null, error: null })
    Object.defineProperty(deleteChain, 'then', {
      value: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
      writable: true,
      configurable: true,
    })
    mockAdminFrom.mockReturnValue(deleteChain)

    const res = await DELETE(makeRequest('DELETE', { id: 'del-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
