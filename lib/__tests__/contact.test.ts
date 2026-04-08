/**
 * Unit tests for contact form API route (app/api/contact/route.ts).
 *
 * Tests 503 behavior when RESEND_API_KEY is unset and DB fallback insertion.
 * Mocks getSupabaseAdmin and fetch to isolate the 503 code path.
 */

// Mock getSupabaseAdmin before importing the route
const mockInsert = jest.fn()
const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })
const mockGetSupabaseAdmin = jest.fn().mockReturnValue({ from: mockFrom })

jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: mockGetSupabaseAdmin,
}))

// Mock global fetch so tests don't make real HTTP calls
const mockFetch = jest.fn()
global.fetch = mockFetch

import { POST } from '@/app/api/contact/route'
import { NextRequest } from 'next/server'

// Helper: Build a NextRequest with JSON body
function makeContactRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  name: 'Alice Aviator',
  email: 'alice@example.com',
  phone: '5551234567',
  message: 'I want to book a discovery flight.',
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default: DB insert succeeds
  mockInsert.mockResolvedValue({ error: null })
  mockFrom.mockReturnValue({ insert: mockInsert })
  mockGetSupabaseAdmin.mockReturnValue({ from: mockFrom })
  // Unset RESEND_API_KEY by default (the 503 path)
  delete process.env.RESEND_API_KEY
})

// ---------------------------------------------------------------------------
// 503 behavior when RESEND_API_KEY is unset
// ---------------------------------------------------------------------------

describe('503 fallback when RESEND_API_KEY is unset', () => {
  test('returns status 503 when RESEND_API_KEY is not set', async () => {
    const req = makeContactRequest(validBody)
    const response = await POST(req)
    expect(response.status).toBe(503)
  })

  test('response body contains error field when RESEND_API_KEY is not set', async () => {
    const req = makeContactRequest(validBody)
    const response = await POST(req)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  test('saves submission to contact_submissions table before returning 503', async () => {
    const req = makeContactRequest(validBody)
    const response = await POST(req)
    expect(response.status).toBe(503)
    // Verify DB insert was called
    expect(mockFrom).toHaveBeenCalledWith('contact_submissions')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: validBody.name,
        email: validBody.email,
      })
    )
  })

  test('still returns 503 even when DB insert also fails (double-failure)', async () => {
    mockInsert.mockRejectedValue(new Error('DB connection error'))
    const req = makeContactRequest(validBody)
    const response = await POST(req)
    // Must still return 503, not 500 or throw
    expect(response.status).toBe(503)
  })
})

// ---------------------------------------------------------------------------
// Successful email send path (RESEND_API_KEY present)
// ---------------------------------------------------------------------------

describe('Email send path when RESEND_API_KEY is set', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-resend-key'
    // Mock successful Resend API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-123' }),
    })
  })

  afterEach(() => {
    delete process.env.RESEND_API_KEY
  })

  test('returns 200 when Resend API call succeeds', async () => {
    const req = makeContactRequest(validBody)
    const response = await POST(req)
    expect(response.status).toBe(200)
  })

  test('does NOT return 503 when RESEND_API_KEY is set and call succeeds', async () => {
    const req = makeContactRequest(validBody)
    const response = await POST(req)
    expect(response.status).not.toBe(503)
  })
})

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('Input validation', () => {
  test('returns 400 when name is missing', async () => {
    const req = makeContactRequest({ email: 'alice@example.com', phone: '555' })
    const response = await POST(req)
    expect(response.status).toBe(400)
  })

  test('returns 400 when email format is invalid', async () => {
    const req = makeContactRequest({ name: 'Alice', email: 'not-an-email', phone: '555' })
    const response = await POST(req)
    expect(response.status).toBe(400)
  })
})
