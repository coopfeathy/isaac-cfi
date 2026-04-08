import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: jest.fn() }, from: jest.fn() } }))
jest.mock('@/lib/supabase-admin', () => ({ getSupabaseAdmin: jest.fn() }))

describe('CFI Availability API', () => {
  describe('GET /api/cfi/availability', () => {
    it('returns 401 when no auth header provided', async () => {
      expect(true).toBe(false) // RED
    })

    it('returns only availability rows for the calling CFI', async () => {
      expect(true).toBe(false) // RED
    })
  })

  describe('POST /api/cfi/availability', () => {
    it('creates availability row with instructor_id = calling user', async () => {
      expect(true).toBe(false) // RED
    })

    it('rejects invalid time format', async () => {
      expect(true).toBe(false) // RED
    })
  })

  describe('PATCH /api/cfi/availability', () => {
    it('updates only rows owned by the calling CFI', async () => {
      expect(true).toBe(false) // RED
    })
  })

  describe('DELETE /api/cfi/availability', () => {
    it('only deletes rows owned by the calling CFI', async () => {
      expect(true).toBe(false) // RED
    })
  })
})
