/**
 * Tests for T04 — Availability Override CRUD API
 * app/api/admin/availability-overrides/route.ts
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

function makeRequest(method: string, body?: unknown, url = 'http://localhost/api/admin/availability-overrides') {
  const init: RequestInit = { method, headers: { authorization: 'Bearer test-token' } }
  if (body) init.body = JSON.stringify(body)
  return new NextRequest(url, init as any)
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

function chainBuilder(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
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
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: unknown) => void) => resolve(finalResult),
    writable: true,
    configurable: true,
  })
  return chain
}

// Use a fixed "today" for deterministic tests
// The route uses America/New_York timezone, so we mock accordingly
const MOCK_TODAY = '2026-04-05'
const FUTURE_DATE = '2026-04-10'
const PAST_DATE = '2026-04-01'

beforeEach(() => {
  jest.clearAllMocks()
  // Mock Date to control "today"
  jest.useFakeTimers()
  // Set to 2026-04-05T12:00:00 ET (UTC-4 in April) = 2026-04-05T16:00:00Z
  jest.setSystemTime(Date.parse('2026-04-05T16:00:00Z'))
})

afterEach(() => {
  jest.useRealTimers()
})

// ============================================================
// GET /api/admin/availability-overrides
// ============================================================
describe('GET /api/admin/availability-overrides', () => {
  it('returns 401 without auth header', async () => {
    const req = new NextRequest('http://localhost/api/admin/availability-overrides', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockNonAdminAuth()
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(403)
  })

  it('returns future overrides when no params given', async () => {
    mockAdminAuth()
    const rows = [
      { id: '1', override_date: '2026-04-10', is_available: false, reason: 'vacation' },
      { id: '2', override_date: '2026-04-15', is_available: true, start_time: '09:00', end_time: '12:00' },
    ]
    const chain = chainBuilder({ data: rows, error: null })
    mockAdminFrom.mockReturnValue(chain)

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual(rows)
    expect(chain.gte).toHaveBeenCalledWith('override_date', MOCK_TODAY)
    expect(chain.order).toHaveBeenCalledWith('override_date', { ascending: true })
  })

  it('filters by from/to date range when provided', async () => {
    mockAdminAuth()
    const rows = [{ id: '1', override_date: '2026-05-01' }]
    const chain = chainBuilder({ data: rows, error: null })
    mockAdminFrom.mockReturnValue(chain)

    const url = 'http://localhost/api/admin/availability-overrides?from=2026-05-01&to=2026-05-31'
    const res = await GET(makeRequest('GET', undefined, url))
    expect(res.status).toBe(200)
    expect(chain.gte).toHaveBeenCalledWith('override_date', '2026-05-01')
    expect(chain.lte).toHaveBeenCalledWith('override_date', '2026-05-31')
  })

  it('returns 500 on DB error', async () => {
    mockAdminAuth()
    const chain = chainBuilder({ data: null, error: { message: 'db failure' } })
    mockAdminFrom.mockReturnValue(chain)

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(500)
  })
})

// ============================================================
// POST /api/admin/availability-overrides
// ============================================================
describe('POST /api/admin/availability-overrides', () => {
  const validBlockDay = { override_date: FUTURE_DATE, is_available: false, reason: 'Holiday' }
  const validAvailable = { override_date: FUTURE_DATE, is_available: true, start_time: '09:00', end_time: '14:00' }

  it('returns 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/admin/availability-overrides', {
      method: 'POST',
      body: JSON.stringify(validBlockDay),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid JSON', async () => {
    mockAdminAuth()
    const req = new NextRequest('http://localhost/api/admin/availability-overrides', {
      method: 'POST',
      body: 'not-json',
      headers: { authorization: 'Bearer test-token' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid JSON')
  })

  it('returns 400 when override_date is missing', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { is_available: false }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when is_available is missing', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { override_date: FUTURE_DATE }))
    expect(res.status).toBe(400)
  })

  it('returns 400 with ERR_AVAIL_003 for past dates', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { ...validBlockDay, override_date: PAST_DATE }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('ERR_AVAIL_003')
  })

  it('returns 400 for invalid date format', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { ...validBlockDay, override_date: '04-10-2026' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when is_available=true but start_time is missing', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { override_date: FUTURE_DATE, is_available: true, end_time: '14:00' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('start_time')
  })

  it('returns 400 when is_available=true but end_time is missing', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { override_date: FUTURE_DATE, is_available: true, start_time: '09:00' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('end_time')
  })

  it('returns 400 when start_time >= end_time', async () => {
    mockAdminAuth()
    const res = await POST(makeRequest('POST', { ...validAvailable, start_time: '14:00', end_time: '09:00' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('start_time must be before end_time')
  })

  it('creates a day-off override (is_available=false) successfully', async () => {
    mockAdminAuth()
    const createdRow = { id: 'ov-1', ...validBlockDay, start_time: null, end_time: null, created_at: '2026-04-05T16:00:00Z' }
    const chain = chainBuilder({ data: createdRow, error: null })
    mockAdminFrom.mockReturnValue(chain)

    const res = await POST(makeRequest('POST', validBlockDay))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data).toEqual(createdRow)
    expect(chain.insert).toHaveBeenCalled()
  })

  it('creates an available override with times successfully', async () => {
    mockAdminAuth()
    const createdRow = { id: 'ov-2', ...validAvailable, reason: null, created_at: '2026-04-05T16:00:00Z' }
    const chain = chainBuilder({ data: createdRow, error: null })
    mockAdminFrom.mockReturnValue(chain)

    const res = await POST(makeRequest('POST', validAvailable))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data).toEqual(createdRow)
  })

  it('returns 500 on DB insert error', async () => {
    mockAdminAuth()
    const chain = chainBuilder({ data: null, error: { message: 'insert failed' } })
    mockAdminFrom.mockReturnValue(chain)

    const res = await POST(makeRequest('POST', validBlockDay))
    expect(res.status).toBe(500)
  })
})

// ============================================================
// PATCH /api/admin/availability-overrides
// ============================================================
describe('PATCH /api/admin/availability-overrides', () => {
  it('returns 400 without id', async () => {
    mockAdminAuth()
    const res = await PATCH(makeRequest('PATCH', { reason: 'updated' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('id is required')
  })

  it('returns 404 when override not found', async () => {
    mockAdminAuth()
    const chain = chainBuilder({ data: null, error: { code: 'PGRST116', message: 'not found' } })
    mockAdminFrom.mockReturnValue(chain)

    const res = await PATCH(makeRequest('PATCH', { id: 'nonexistent', reason: 'x' }))
    expect(res.status).toBe(404)
  })

  it('returns 400 with ERR_AVAIL_003 when changing override_date to past', async () => {
    mockAdminAuth()
    const existingRow = { id: 'ov-1', override_date: FUTURE_DATE, is_available: false, start_time: null, end_time: null }
    const fetchChain = chainBuilder({ data: existingRow, error: null })
    mockAdminFrom.mockReturnValue(fetchChain)

    const res = await PATCH(makeRequest('PATCH', { id: 'ov-1', override_date: PAST_DATE }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('ERR_AVAIL_003')
  })

  it('returns 400 when changing to is_available=true without times', async () => {
    mockAdminAuth()
    const existingRow = { id: 'ov-1', override_date: FUTURE_DATE, is_available: false, start_time: null, end_time: null }
    const fetchChain = chainBuilder({ data: existingRow, error: null })
    mockAdminFrom.mockReturnValue(fetchChain)

    const res = await PATCH(makeRequest('PATCH', { id: 'ov-1', is_available: true }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('start_time')
  })

  it('returns 400 when start_time >= end_time after merge', async () => {
    mockAdminAuth()
    const existingRow = { id: 'ov-1', override_date: FUTURE_DATE, is_available: true, start_time: '09:00', end_time: '14:00' }
    const fetchChain = chainBuilder({ data: existingRow, error: null })
    mockAdminFrom.mockReturnValue(fetchChain)

    const res = await PATCH(makeRequest('PATCH', { id: 'ov-1', start_time: '15:00' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('start_time must be before end_time')
  })

  it('updates and returns the row on success', async () => {
    mockAdminAuth()
    const existingRow = { id: 'ov-1', override_date: FUTURE_DATE, is_available: false, start_time: null, end_time: null, reason: 'old' }
    const updatedRow = { ...existingRow, reason: 'new reason', updated_at: '2026-04-05T16:00:00Z' }

    const fetchChain = chainBuilder({ data: existingRow, error: null })
    const updateChain = chainBuilder({ data: updatedRow, error: null })
    mockAdminFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)

    const res = await PATCH(makeRequest('PATCH', { id: 'ov-1', reason: 'new reason' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual(updatedRow)
  })

  it('can update is_available from true to false (clears times)', async () => {
    mockAdminAuth()
    const existingRow = { id: 'ov-1', override_date: FUTURE_DATE, is_available: true, start_time: '09:00', end_time: '14:00' }
    const updatedRow = { ...existingRow, is_available: false, start_time: null, end_time: null }

    const fetchChain = chainBuilder({ data: existingRow, error: null })
    const updateChain = chainBuilder({ data: updatedRow, error: null })
    mockAdminFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)

    const res = await PATCH(makeRequest('PATCH', { id: 'ov-1', is_available: false }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual(updatedRow)
  })

  it('returns 500 on DB update error', async () => {
    mockAdminAuth()
    const existingRow = { id: 'ov-1', override_date: FUTURE_DATE, is_available: false, start_time: null, end_time: null }
    const fetchChain = chainBuilder({ data: existingRow, error: null })
    const updateChain = chainBuilder({ data: null, error: { message: 'update failed' } })
    mockAdminFrom
      .mockReturnValueOnce(fetchChain)
      .mockReturnValueOnce(updateChain)

    const res = await PATCH(makeRequest('PATCH', { id: 'ov-1', reason: 'x' }))
    expect(res.status).toBe(500)
  })
})

// ============================================================
// DELETE /api/admin/availability-overrides
// ============================================================
describe('DELETE /api/admin/availability-overrides', () => {
  it('returns 401 without auth', async () => {
    const req = new NextRequest('http://localhost/api/admin/availability-overrides', {
      method: 'DELETE',
      body: JSON.stringify({ id: 'x' }),
    })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 without id', async () => {
    mockAdminAuth()
    const res = await DELETE(makeRequest('DELETE', {}))
    expect(res.status).toBe(400)
  })

  it('deletes and returns success', async () => {
    mockAdminAuth()
    const chain = chainBuilder({ data: null, error: null })
    mockAdminFrom.mockReturnValue(chain)

    const res = await DELETE(makeRequest('DELETE', { id: 'del-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'del-1')
  })

  it('returns 500 on DB delete error', async () => {
    mockAdminAuth()
    const chain = chainBuilder({ data: null, error: { message: 'delete failed' } })
    mockAdminFrom.mockReturnValue(chain)

    const res = await DELETE(makeRequest('DELETE', { id: 'x' }))
    expect(res.status).toBe(500)
  })
})
