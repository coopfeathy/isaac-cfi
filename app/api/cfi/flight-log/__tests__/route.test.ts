import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRequireCFI = jest.fn()

jest.mock('@/lib/auth', () => ({
  requireCFI: mockRequireCFI,
}))

const mockAdminFrom = jest.fn()
const mockAdminRpc = jest.fn()
jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ from: mockAdminFrom, rpc: mockAdminRpc }),
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

describe('CFI Flight Log API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cfi/flight-log', () => {
    it('returns 401 when no auth header', async () => {
      mockCFIUnauth()
      const req = makeRequest('GET', 'http://localhost/api/cfi/flight-log')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns flight log entries for authenticated CFI', async () => {
      mockCFIAuth('cfi-123')

      // First call: students query
      const studentsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ user_id: 'student-1', full_name: 'Alice Student' }],
          error: null,
        }),
      }

      // Second call: completions query
      const orderMock = jest.fn().mockReturnThis()
      const completionsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: orderMock,
        limit: jest.fn().mockResolvedValue({
          data: [
            { id: 'log-1', student_id: 'student-1', instructor_id: 'cfi-123', completed_at: '2026-04-01', notes: null },
          ],
          error: null,
        }),
      }

      mockAdminFrom
        .mockReturnValueOnce(studentsChain)
        .mockReturnValueOnce(completionsChain)

      const req = makeRequest('GET', 'http://localhost/api/cfi/flight-log', undefined, 'token')
      const res = await GET(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(Array.isArray(body)).toBe(true)
    })
  })

  describe('POST /api/cfi/flight-log', () => {
    it('returns 401 when no auth header', async () => {
      mockCFIUnauth()
      const req = makeRequest('POST', 'http://localhost/api/cfi/flight-log', {
        student_id: 'student-1',
        hours: 1.5,
        date: '2026-04-01',
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 403 when student_id is not in CFI roster', async () => {
      mockCFIAuth('cfi-123')

      // Students roster check returns null (not found)
      const rosterChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }
      mockAdminFrom.mockReturnValueOnce(rosterChain)

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/flight-log',
        { student_id: 'other-student', hours: 1.0, date: '2026-04-01' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toContain('Student not found in your roster')
    })

    it('returns 400 when hours is missing', async () => {
      mockCFIAuth('cfi-123')

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/flight-log',
        { student_id: 'student-1', date: '2026-04-01' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('hours')
    })

    it('inserts completion row and calls increment_student_hours RPC on success', async () => {
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

      // Insert completion
      const insertChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      }

      mockAdminFrom
        .mockReturnValueOnce(rosterChain)
        .mockReturnValueOnce(insertChain)

      // RPC call for atomic hours increment
      mockAdminRpc.mockResolvedValueOnce({ error: null })

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/flight-log',
        { student_id: 'student-1', hours: 1.5, date: '2026-04-01', notes: 'Great lesson' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(201)
      // Verify RPC was called with correct args
      expect(mockAdminRpc).toHaveBeenCalledWith('increment_student_hours', {
        p_student_user_id: 'student-1',
        p_hours: 1.5,
      })
      // Verify insert was called (on flight log table)
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: 'student-1',
          instructor_id: 'cfi-123',
          completed_at: '2026-04-01',
          notes: 'Great lesson',
        })
      )
    })

    it('returns 201 with success true, student_name, and hours_logged on success', async () => {
      mockCFIAuth('cfi-123')

      const rosterChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'student-row-1', user_id: 'student-1', full_name: 'Bob Trainee' },
          error: null,
        }),
      }

      const insertChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      }

      mockAdminFrom
        .mockReturnValueOnce(rosterChain)
        .mockReturnValueOnce(insertChain)

      mockAdminRpc.mockResolvedValueOnce({ error: null })

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/flight-log',
        { student_id: 'student-1', hours: 2.0, date: '2026-04-01' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.student_name).toBe('Bob Trainee')
      expect(body.hours_logged).toBe(2.0)
    })
  })
})
