/**
 * Unit tests for upload-image route validation logic.
 *
 * Tests MIME type allowlist and file size limit validation.
 * Mocks requireAdmin and getSupabaseAdmin to isolate validation behavior.
 */

// Mock requireAdmin and getSupabaseAdmin before importing the route
const mockRequireAdmin = jest.fn()
const mockStorageUpload = jest.fn()
const mockStorageGetPublicUrl = jest.fn()
const mockStorageFrom = jest.fn().mockReturnValue({
  upload: mockStorageUpload,
  getPublicUrl: mockStorageGetPublicUrl,
})
const mockGetSupabaseAdmin = jest.fn().mockReturnValue({
  storage: {
    from: mockStorageFrom,
  },
})

jest.mock('@/lib/auth', () => ({
  requireAdmin: mockRequireAdmin,
}))

jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: mockGetSupabaseAdmin,
}))

import { POST } from '@/app/api/upload-image/route'
import { NextRequest } from 'next/server'

// Helper: Build a multipart FormData request with a fake file
function makeUploadRequest(mimeType: string, sizeBytes: number): NextRequest {
  const buffer = Buffer.alloc(sizeBytes)
  const file = new File([buffer], 'test-file.jpg', { type: mimeType })
  const formData = new FormData()
  formData.append('file', file)

  const req = new NextRequest('http://localhost/api/upload-image', {
    method: 'POST',
    body: formData,
  })
  return req
}

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

beforeEach(() => {
  jest.clearAllMocks()
  // Default: admin auth passes
  mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' }, profile: { is_admin: true } })
  // Default: storage upload succeeds
  mockStorageUpload.mockResolvedValue({ error: null })
  mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } })
  mockStorageFrom.mockReturnValue({
    upload: mockStorageUpload,
    getPublicUrl: mockStorageGetPublicUrl,
  })
  mockGetSupabaseAdmin.mockReturnValue({ storage: { from: mockStorageFrom } })
})

// ---------------------------------------------------------------------------
// MIME type validation
// ---------------------------------------------------------------------------

describe('MIME type validation', () => {
  test('returns 400 when file MIME type is application/pdf (not in allowlist)', async () => {
    const req = makeUploadRequest('application/pdf', 1024)
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/jpeg|png|webp/i)
  })

  test('returns 400 when file MIME type is text/html (not in allowlist)', async () => {
    const req = makeUploadRequest('text/html', 1024)
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/jpeg|png|webp/i)
  })

  test('accepts image/jpeg (in allowlist)', async () => {
    const req = makeUploadRequest('image/jpeg', 1024)
    const response = await POST(req)
    expect(response.status).toBe(200)
  })

  test('accepts image/png (in allowlist)', async () => {
    const req = makeUploadRequest('image/png', 1024)
    const response = await POST(req)
    expect(response.status).toBe(200)
  })

  test('accepts image/webp (in allowlist)', async () => {
    const req = makeUploadRequest('image/webp', 1024)
    const response = await POST(req)
    expect(response.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Size validation
// ---------------------------------------------------------------------------

describe('Size validation', () => {
  test('returns 400 when file size exceeds 5MB (5MB + 1 byte)', async () => {
    const req = makeUploadRequest('image/jpeg', MAX_SIZE + 1)
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/5mb|limit/i)
  })

  test('accepts file at exactly 5MB', async () => {
    const req = makeUploadRequest('image/jpeg', MAX_SIZE)
    const response = await POST(req)
    expect(response.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('Auth guard', () => {
  test('returns 401 when requireAdmin returns an error response', async () => {
    const { NextResponse } = await import('next/server')
    mockRequireAdmin.mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })
    const req = makeUploadRequest('image/jpeg', 1024)
    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  test('returns 403 when requireAdmin returns a forbidden error', async () => {
    const { NextResponse } = await import('next/server')
    mockRequireAdmin.mockResolvedValue({
      error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
    })
    const req = makeUploadRequest('image/jpeg', 1024)
    const response = await POST(req)
    expect(response.status).toBe(403)
  })
})
