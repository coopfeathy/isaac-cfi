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
  return new NextRequest('http://localhost/api/cfi/students', { headers })
}

function mockCFIAuth(userId = 'cfi-id') {
  mockRequireCFI.mockResolvedValueOnce({
    user: { id: userId, email: 'cfi@test.com' },
    profile: { is_instructor: true, is_admin: false },
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/cfi/students', () => {
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

  it('returns only students where instructor_id matches the calling CFI', async () => {
    mockCFIAuth('cfi-user-id')

    const students = [
      {
        id: 'student-row-1',
        user_id: 'student-1',
        full_name: 'Alice Pilot',
        email: 'alice@test.com',
        dual_hours: 12.5,
        total_hours: 20.0,
        created_at: new Date().toISOString(),
      },
    ]

    const studentsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: students, error: null }),
    }

    // Verify instructor_id eq is called with user.id
    const eqSpy = studentsChain.eq

    mockAdminFrom.mockReturnValueOnce(studentsChain)

    // Endorsements chain
    const endorsementsChain = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockAdminFrom.mockReturnValueOnce(endorsementsChain)

    const req = makeRequest('valid-token')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].full_name).toBe('Alice Pilot')

    // Verify .eq('instructor_id', user.id) was called
    expect(eqSpy).toHaveBeenCalledWith('instructor_id', 'cfi-user-id')
  })

  it('returns empty array when CFI has no students', async () => {
    mockCFIAuth()

    const studentsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockAdminFrom.mockReturnValueOnce(studentsChain)

    const req = makeRequest('valid-token')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('enriches each student with endorsement_count from student_endorsements', async () => {
    mockCFIAuth('cfi-user-id')

    const students = [
      {
        id: 'student-row-1',
        user_id: 'student-1',
        full_name: 'Bob Flyer',
        email: 'bob@test.com',
        dual_hours: 5.0,
        total_hours: 8.0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'student-row-2',
        user_id: 'student-2',
        full_name: 'Carol Sky',
        email: 'carol@test.com',
        dual_hours: 0.0,
        total_hours: 0.0,
        created_at: new Date().toISOString(),
      },
    ]

    const studentsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: students, error: null }),
    }
    mockAdminFrom.mockReturnValueOnce(studentsChain)

    // student-1 has 2 endorsements, student-2 has none
    const endorsements = [
      { student_id: 'student-1' },
      { student_id: 'student-1' },
    ]
    const endorsementsChain = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: endorsements, error: null }),
    }
    mockAdminFrom.mockReturnValueOnce(endorsementsChain)

    const req = makeRequest('valid-token')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(2)

    const bob = body.find((s: { full_name: string }) => s.full_name === 'Bob Flyer')
    expect(bob.endorsement_count).toBe(2)

    const carol = body.find((s: { full_name: string }) => s.full_name === 'Carol Sky')
    expect(carol.endorsement_count).toBe(0)
  })
})
