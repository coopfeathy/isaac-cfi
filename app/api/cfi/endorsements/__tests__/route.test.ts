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

// ── Import routes after mocks ─────────────────────────────────────────────────
import { GET, POST } from '../route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, body?: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['authorization'] = `Bearer ${token}`
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

function mockCFIAuth(userId = 'cfi-id') {
  mockRequireCFI.mockResolvedValueOnce({
    user: { id: userId, email: 'cfi@test.com' },
    profile: { is_instructor: true, is_admin: false },
  })
}

function mockCFIUnauth() {
  mockRequireCFI.mockResolvedValueOnce({
    error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CFI Endorsements API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cfi/endorsements', () => {
    it('returns 401 when no auth header', async () => {
      mockCFIUnauth()
      const req = makeRequest('GET', 'http://localhost/api/cfi/endorsements')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns endorsements for authenticated CFI', async () => {
      mockCFIAuth('cfi-123')

      const endorsements = [
        {
          id: 'end-1',
          student_id: 'student-1',
          instructor_id: 'cfi-123',
          endorsement_type: 'solo',
          endorsed_at: '2026-04-01',
          notes: null,
        },
      ]
      const orderMock = jest.fn().mockReturnThis()
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: orderMock,
        limit: jest.fn().mockResolvedValue({ data: endorsements, error: null }),
      }
      mockAdminFrom.mockReturnValueOnce(chain)

      const req = makeRequest('GET', 'http://localhost/api/cfi/endorsements', undefined, 'token')
      const res = await GET(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(1)
    })
  })

  describe('POST /api/cfi/endorsements', () => {
    it('returns 401 when no auth header', async () => {
      mockCFIUnauth()
      const req = makeRequest('POST', 'http://localhost/api/cfi/endorsements', {
        student_id: 'student-1',
        endorsement_type: 'solo',
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 403 when student is not in CFI roster', async () => {
      mockCFIAuth('cfi-123')

      // Roster check returns null
      const rosterChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }
      mockAdminFrom.mockReturnValueOnce(rosterChain)

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/endorsements',
        { student_id: 'other-student', endorsement_type: 'solo' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toContain('Student not found in your roster')
    })

    it('returns 400 for invalid endorsement_type', async () => {
      mockCFIAuth('cfi-123')

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/endorsements',
        { student_id: 'student-1', endorsement_type: 'invalid' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('endorsement_type must be one of')
    })

    it('inserts endorsement with instructor_id = calling CFI', async () => {
      mockCFIAuth('cfi-123')

      // Roster check returns student
      const rosterChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'student-row-1', user_id: 'student-1', full_name: 'Alice Student' },
          error: null,
        }),
      }

      const insertedEndorsement = {
        id: 'end-1',
        student_id: 'student-1',
        instructor_id: 'cfi-123',
        endorsement_type: 'solo',
        endorsed_at: '2026-04-01T00:00:00Z',
        notes: null,
      }
      const insertMock = jest.fn().mockReturnThis()
      const insertChain = {
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: insertedEndorsement, error: null }),
      }

      mockAdminFrom
        .mockReturnValueOnce(rosterChain)
        .mockReturnValueOnce(insertChain)

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/endorsements',
        { student_id: 'student-1', endorsement_type: 'solo' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(201)
      // Verify instructor_id was included in the insert
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          instructor_id: 'cfi-123',
          student_id: 'student-1',
          endorsement_type: 'solo',
        })
      )
    })

    it('returns 201 with endorsement object on success', async () => {
      mockCFIAuth('cfi-123')

      const rosterChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'student-row-1', user_id: 'student-1', full_name: 'Bob Trainee' },
          error: null,
        }),
      }

      const insertedEndorsement = {
        id: 'end-2',
        student_id: 'student-1',
        instructor_id: 'cfi-123',
        endorsement_type: 'checkride_prep',
        endorsed_at: '2026-04-01T00:00:00Z',
        notes: 'Ready for checkride',
      }
      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: insertedEndorsement, error: null }),
      }

      mockAdminFrom
        .mockReturnValueOnce(rosterChain)
        .mockReturnValueOnce(insertChain)

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/endorsements',
        { student_id: 'student-1', endorsement_type: 'checkride_prep', notes: 'Ready for checkride' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.id).toBe('end-2')
      expect(body.endorsement_type).toBe('checkride_prep')
      expect(body.instructor_id).toBe('cfi-123')
    })
  })
})
