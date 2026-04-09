// Set env vars before any module is imported to prevent module-level guard from throwing
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

import { NextRequest } from 'next/server'

// Mock Supabase admin — must be before route import
const mockMaybeSingle = jest.fn()
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockInsert = jest.fn()
const mockUpdateEq = jest.fn()
const mockUpdateBuilder = jest.fn(() => ({ eq: mockUpdateEq }))

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdateBuilder,
}))

const mockSupabaseAdmin = { from: mockFrom }

jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: jest.fn(() => mockSupabaseAdmin),
}))

// Mock the Resend package so module-level instantiation in lib/resend.ts is safe
const mockEmailsSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}))

// Mock lib/resend to bypass module-level RESEND_API_KEY guard and provide templates
jest.mock('@/lib/resend', () => ({
  emailTemplates: {
    prospectWelcome: (name: string) => ({
      subject: `Your Discovery Flight is Confirmed — What Happens Next`,
      html: `<p>Hi ${name}</p>`,
    }),
    prospectFollowUpDay3: (name: string) => ({
      subject: `Still thinking about flying, ${name}?`,
      html: `<p>Hi ${name}</p>`,
    }),
    prospectFollowUpDay7: (name: string) => ({
      subject: `Your flight is waiting, ${name}`,
      html: `<p>Hi ${name}</p>`,
    }),
  },
}))

import { POST } from '../route'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/discovery-flight-signup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/discovery-flight-signup', () => {
  describe('new prospect (INSERT path)', () => {
    it('calls resend.emails.send with prospectWelcome template and updates sequence_step to 1', async () => {
      // No existing prospect
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })
      // Insert succeeds
      mockInsert.mockResolvedValue({ data: [{ id: 'uuid-1' }], error: null })
      // Email send succeeds
      mockEmailsSend.mockResolvedValue({ data: { id: 'email-id' }, error: null })
      // Update sequence_step succeeds
      mockUpdateEq.mockResolvedValue({ data: null, error: null })

      const req = makeRequest({ email: 'test@example.com' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockEmailsSend).toHaveBeenCalledTimes(1)
      const sendCall = mockEmailsSend.mock.calls[0][0]
      expect(sendCall.subject).toMatch(/Discovery Flight is Confirmed/i)
      expect(sendCall.to).toContain('test@example.com')
      // sequence_step should be updated to 1
      expect(mockUpdateEq).toHaveBeenCalled()
    })

    it('returns 200 and prospect row exists even when Resend throws', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })
      mockInsert.mockResolvedValue({ data: [{ id: 'uuid-1' }], error: null })
      // Resend throws
      mockEmailsSend.mockRejectedValue(new Error('Resend API error'))

      const req = makeRequest({ email: 'fail@example.com' })
      const res = await POST(req)

      // Must still return 200 — email failure does not affect response
      expect(res.status).toBe(200)
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('existing prospect (UPDATE path)', () => {
    it('does NOT send day-0 email on existing prospect update', async () => {
      // Existing prospect found
      mockMaybeSingle.mockResolvedValue({ data: { id: 'existing-id' }, error: null })
      mockUpdateEq.mockResolvedValue({ data: null, error: null })

      const req = makeRequest({ email: 'existing@example.com' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      // Email must NOT be sent for existing prospects
      expect(mockEmailsSend).not.toHaveBeenCalled()
    })
  })
})
