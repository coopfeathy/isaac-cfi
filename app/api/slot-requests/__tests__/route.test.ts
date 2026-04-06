/**
 * Tests for T05 — Extended Slot Requests API
 * app/api/slot-requests/route.ts
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

// Mock fetch for Resend email
global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock

import { POST, GET } from '../route'

// --- Helpers ---

function makeRequest(method: string, body?: unknown, headers: Record<string, string> = {}) {
  const init: RequestInit = { method, headers: { ...headers } }
  if (body) init.body = JSON.stringify(body)
  return new NextRequest('http://localhost/api/slot-requests', init)
}

function makeAuthRequest(method: string, body?: unknown) {
  return makeRequest(method, body, { authorization: 'Bearer test-token' })
}

function mockAuthUser(userId = 'user-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null })
}

function mockAuthFailure() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } })
}

function chainBuilder(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.insert = jest.fn().mockReturnValue(chain)
  chain.update = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
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

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.RESEND_API_KEY
  delete process.env.ALERT_RECIPIENT_EMAIL
  delete process.env.ADMIN_EMAIL
})

// ============================================================
// POST /api/slot-requests — Legacy discovery flight format
// ============================================================
describe('POST /api/slot-requests — legacy discovery_flight format', () => {
  const legacyBody = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-0100',
    preferredDate: '2026-04-10',
    preferredStartTime: '14:00',
    durationMinutes: 90,
    notes: 'First flight!',
  }

  it('inserts a slot request and returns success', async () => {
    const insertChain = chainBuilder({ data: { id: 'req-1' }, error: null })
    mockAdminFrom.mockReturnValue(insertChain)

    const res = await POST(makeRequest('POST', legacyBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest('POST', { fullName: 'Jane' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid duration', async () => {
    const res = await POST(makeRequest('POST', { ...legacyBody, durationMinutes: 999 }))
    expect(res.status).toBe(400)
  })
})

// ============================================================
// POST /api/slot-requests — New training request format
// ============================================================
describe('POST /api/slot-requests — training request', () => {
  const trainingBody = {
    preferred_start_time: '2026-04-15T10:00:00Z',
    preferred_end_time: '2026-04-15T11:30:00Z',
    request_type: 'training',
    notes: 'Lesson 5',
  }

  it('returns 401 without auth for training requests', async () => {
    const res = await POST(makeRequest('POST', trainingBody))
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    mockAuthFailure()
    const res = await POST(makeAuthRequest('POST', trainingBody))
    expect(res.status).toBe(401)
  })

  it('auto-populates profile data and inserts request', async () => {
    mockAuthUser('user-1')
    // Profile lookup chain
    const profileChain = chainBuilder({
      data: { full_name: 'Student One', email: 'student@example.com', phone: '555-0200' },
      error: null,
    })
    mockFrom.mockReturnValue(profileChain)

    // Duplicate check — no overlapping requests
    const dupChain = chainBuilder({ data: [], error: null })
    // Insert chain
    const insertChain = chainBuilder({ data: { id: 'req-2' }, error: null })
    mockAdminFrom
      .mockReturnValueOnce(dupChain)
      .mockReturnValueOnce(insertChain)

    const res = await POST(makeAuthRequest('POST', trainingBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    // Verify insert was called with correct data
    expect(insertChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-1',
        full_name: 'Student One',
        email: 'student@example.com',
        phone: '555-0200',
        request_type: 'training',
        source: 'student_calendar',
        status: 'pending',
      }),
    ])
  })

  it('returns 409 ERR_REQ_002 for duplicate pending request', async () => {
    mockAuthUser('user-1')
    const profileChain = chainBuilder({
      data: { full_name: 'Student One', email: 'student@example.com', phone: '555-0200' },
      error: null,
    })
    mockFrom.mockReturnValue(profileChain)

    // Duplicate check returns overlapping request
    const dupChain = chainBuilder({ data: [{ id: 'existing-req' }], error: null })
    mockAdminFrom.mockReturnValueOnce(dupChain)

    const res = await POST(makeAuthRequest('POST', trainingBody))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe('ERR_REQ_002')
  })
})

// ============================================================
// POST /api/slot-requests — New discovery_flight format (ISO)
// ============================================================
describe('POST /api/slot-requests — new discovery_flight format', () => {
  const newFormatBody = {
    preferred_start_time: '2026-04-20T09:00:00Z',
    preferred_end_time: '2026-04-20T10:30:00Z',
    request_type: 'discovery_flight',
    full_name: 'Walk In',
    email: 'walkin@example.com',
    phone: '555-0300',
  }

  it('inserts without auth for discovery_flight type', async () => {
    const insertChain = chainBuilder({ data: { id: 'req-3' }, error: null })
    mockAdminFrom.mockReturnValue(insertChain)

    const res = await POST(makeRequest('POST', newFormatBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('400 when discovery_flight missing name/email/phone', async () => {
    const res = await POST(makeRequest('POST', {
      preferred_start_time: '2026-04-20T09:00:00Z',
      preferred_end_time: '2026-04-20T10:30:00Z',
      request_type: 'discovery_flight',
    }))
    expect(res.status).toBe(400)
  })
})

// ============================================================
// GET /api/slot-requests — Student's own requests
// ============================================================
describe('GET /api/slot-requests', () => {
  it('returns 401 without auth', async () => {
    mockAuthFailure()
    const res = await GET(makeAuthRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('returns 401 without auth header', async () => {
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('returns current user requests ordered by created_at DESC', async () => {
    mockAuthUser('user-1')
    const rows = [
      { id: 'req-2', status: 'pending', created_at: '2026-04-15T10:00:00Z' },
      { id: 'req-1', status: 'approved', created_at: '2026-04-10T10:00:00Z' },
    ]
    const chain = chainBuilder({ data: rows, error: null })
    mockAdminFrom.mockReturnValue(chain)

    const res = await GET(makeAuthRequest('GET'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.requests).toEqual(rows)
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })
})
