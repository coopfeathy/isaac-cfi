import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRequireCFI = jest.fn()

jest.mock('@/lib/auth', () => ({
  requireCFI: mockRequireCFI,
}))

const mockAdminFrom = jest.fn()
jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ from: mockAdminFrom }),
}))

// ── Import route after mocks ──────────────────────────────────────────────────
import { GET } from '../route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token) headers['authorization'] = `Bearer ${token}`
  return new NextRequest('http://localhost/api/cfi/schedule', { headers })
}

function mockCFIAuth(userId = 'cfi-id') {
  mockRequireCFI.mockResolvedValueOnce({
    user: { id: userId, email: 'cfi@test.com' },
    profile: { is_instructor: true, is_admin: false },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/cfi/schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when no auth header provided', async () => {
    mockRequireCFI.mockResolvedValueOnce({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    })
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns empty array when CFI has no students', async () => {
    mockCFIAuth()

    const studentsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockAdminFrom.mockReturnValueOnce(studentsChain)

    const req = makeRequest('valid-token')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns only bookings for students assigned to the calling CFI', async () => {
    mockCFIAuth()

    const students = [{ user_id: 'student-1', full_name: 'Alice Pilot', email: 'alice@test.com' }]
    const studentsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: students, error: null }),
    }
    mockAdminFrom.mockReturnValueOnce(studentsChain)

    const bookings = [
      {
        id: 'booking-1',
        status: 'confirmed',
        notes: null,
        user_id: 'student-1',
        created_at: new Date().toISOString(),
        slots: { start_time: new Date().toISOString(), end_time: new Date().toISOString(), type: 'training' },
      },
    ]
    const bookingsChain = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: bookings, error: null }),
    }
    mockAdminFrom.mockReturnValueOnce(bookingsChain)

    const req = makeRequest('valid-token')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].student_name).toBe('Alice Pilot')
    expect(body[0].user_id).toBe('student-1')
  })

  it('filters bookings to pending, confirmed, completed statuses', async () => {
    mockCFIAuth()

    const students = [{ user_id: 'student-1', full_name: 'Bob Flyer', email: 'bob@test.com' }]
    const studentsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: students, error: null }),
    }
    mockAdminFrom.mockReturnValueOnce(studentsChain)

    const inMock = jest.fn().mockReturnThis()
    const bookingsChain = {
      select: jest.fn().mockReturnThis(),
      in: inMock,
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockAdminFrom.mockReturnValueOnce(bookingsChain)

    const req = makeRequest('valid-token')
    await GET(req)

    // Verify that `.in('status', [...])` was called with the correct statuses
    const statusCallArgs = inMock.mock.calls.find((call: unknown[]) => call[0] === 'status')
    expect(statusCallArgs).toBeDefined()
    expect(statusCallArgs![1]).toEqual(expect.arrayContaining(['pending', 'confirmed', 'completed']))
  })
})
