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
import { GET, POST, PATCH, DELETE } from '../route'

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

describe('CFI Availability API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/cfi/availability', () => {
    it('returns 401 when not authenticated', async () => {
      mockCFIUnauth()
      const req = makeRequest('GET', 'http://localhost/api/cfi/availability')
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns only availability rows for the calling CFI', async () => {
      mockCFIAuth('cfi-123')

      const rows = [
        { id: 'row-1', instructor_id: 'cfi-123', day_of_week: 1, start_time: '08:00:00', end_time: '12:00:00', is_active: true },
      ]
      const eqMock = jest.fn().mockReturnThis()
      const orderMock = jest.fn().mockReturnThis()
      const finalOrder = jest.fn().mockResolvedValue({ data: rows, error: null })
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        order: orderMock,
      }
      // first order call returns same chain, second order call returns the promise
      orderMock.mockReturnValueOnce({ ...chain, order: finalOrder }).mockReturnValueOnce({ data: rows, error: null })

      mockAdminFrom.mockReturnValueOnce(chain)

      const req = makeRequest('GET', 'http://localhost/api/cfi/availability', undefined, 'token')
      const res = await GET(req)

      // Verify instructor_id filter was applied
      expect(eqMock).toHaveBeenCalledWith('instructor_id', 'cfi-123')
    })
  })

  describe('POST /api/cfi/availability', () => {
    it('creates availability row with instructor_id = calling user', async () => {
      mockCFIAuth('cfi-123')

      // overlap check returns empty
      const overlapChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockAdminFrom.mockReturnValueOnce(overlapChain)

      const insertedRow = {
        id: 'new-row',
        instructor_id: 'cfi-123',
        day_of_week: 1,
        start_time: '08:00:00',
        end_time: '12:00:00',
        is_active: true,
      }
      const insertMock = jest.fn().mockReturnThis()
      const insertChain = {
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: insertedRow, error: null }),
      }
      mockAdminFrom.mockReturnValueOnce(insertChain)

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/availability',
        { day_of_week: 1, start_time: '08:00', end_time: '12:00' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(201)
      // Verify instructor_id was included in the insert
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ instructor_id: 'cfi-123' })
      )
    })

    it('rejects invalid time format', async () => {
      mockCFIAuth()

      const req = makeRequest(
        'POST',
        'http://localhost/api/cfi/availability',
        { day_of_week: 1, start_time: '8am', end_time: '12pm' },
        'token'
      )
      const res = await POST(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('HH:MM')
    })
  })

  describe('PATCH /api/cfi/availability', () => {
    it('returns 404 when row not owned by calling CFI', async () => {
      mockCFIAuth('cfi-123')

      // fetch returns null (not found for this CFI)
      const fetchChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }
      mockAdminFrom.mockReturnValueOnce(fetchChain)

      const req = makeRequest(
        'PATCH',
        'http://localhost/api/cfi/availability',
        { id: 'other-row', start_time: '09:00', end_time: '11:00' },
        'token'
      )
      const res = await PATCH(req)

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/cfi/availability', () => {
    it('only deletes rows owned by the calling CFI (scoped by instructor_id)', async () => {
      mockCFIAuth('cfi-123')

      const deletedRows = [{ id: 'row-1' }]
      const eqMock = jest.fn().mockReturnThis()
      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: eqMock,
        select: jest.fn().mockResolvedValue({ data: deletedRows, error: null }),
      }
      mockAdminFrom.mockReturnValueOnce(deleteChain)

      const req = makeRequest('DELETE', 'http://localhost/api/cfi/availability?id=row-1', undefined, 'token')
      const res = await DELETE(req)

      expect(res.status).toBe(204)
      // Verify both id and instructor_id scope were applied
      expect(eqMock).toHaveBeenCalledWith('instructor_id', 'cfi-123')
    })

    it('returns 404 when row not found or not owned by CFI', async () => {
      mockCFIAuth('cfi-123')

      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      mockAdminFrom.mockReturnValueOnce(deleteChain)

      const req = makeRequest('DELETE', 'http://localhost/api/cfi/availability?id=other-row', undefined, 'token')
      const res = await DELETE(req)

      expect(res.status).toBe(404)
    })
  })
})
