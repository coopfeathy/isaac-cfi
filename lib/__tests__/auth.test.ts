/**
 * Unit tests for lib/auth.ts auth guard functions.
 *
 * Tests all three guards: requireAdmin, requireCFI, requireUser.
 * Mocks @/lib/supabase so tests do not hit the network.
 */

import { NextRequest } from 'next/server'

// Mock the supabase client before importing lib/auth
const mockGetUser = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()

const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
})

mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ single: mockSingle })

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  },
}))

import { requireAdmin, requireCFI, requireUser } from '@/lib/auth'

// Helper to build a NextRequest with optional Authorization header
function makeRequest(token?: string): NextRequest {
  const url = 'http://localhost/api/test'
  const headers: Record<string, string> = {}
  if (token !== undefined) {
    headers['authorization'] = `Bearer ${token}`
  }
  return new NextRequest(url, { method: 'GET', headers })
}

async function getStatus(response: Response): Promise<number> {
  return response.status
}

beforeEach(() => {
  jest.clearAllMocks()
  // Reset chained mock returns
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle })
  mockFrom.mockReturnValue({ select: mockSelect })
})

// ---------------------------------------------------------------------------
// requireAdmin
// ---------------------------------------------------------------------------

describe('requireAdmin', () => {
  test('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest(undefined)
    const result = await requireAdmin(req)
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(await getStatus(result.error)).toBe(401)
    }
  })

  test('returns 401 when token is invalid or expired', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') })
    const req = makeRequest('bad-token')
    const result = await requireAdmin(req)
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(await getStatus(result.error)).toBe(401)
    }
  })

  test('returns 403 when user is authenticated but is_admin is false', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSingle.mockResolvedValue({ data: { is_admin: false }, error: null })
    const req = makeRequest('valid-token')
    const result = await requireAdmin(req)
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(await getStatus(result.error)).toBe(403)
    }
  })

  test('returns { user, profile } when user is an admin', async () => {
    const fakeUser = { id: 'admin-1' }
    const fakeProfile = { is_admin: true }
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null })
    mockSingle.mockResolvedValue({ data: fakeProfile, error: null })
    const req = makeRequest('valid-admin-token')
    const result = await requireAdmin(req)
    expect('user' in result).toBe(true)
    expect('profile' in result).toBe(true)
    if ('user' in result) {
      expect(result.user).toBe(fakeUser)
    }
  })
})

// ---------------------------------------------------------------------------
// requireCFI
// ---------------------------------------------------------------------------

describe('requireCFI', () => {
  test('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest(undefined)
    const result = await requireCFI(req)
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(await getStatus(result.error)).toBe(401)
    }
  })

  test('returns { user, profile } when user is_instructor is true', async () => {
    const fakeUser = { id: 'cfi-1' }
    const fakeProfile = { is_admin: false, is_instructor: true }
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null })
    mockSingle.mockResolvedValue({ data: fakeProfile, error: null })
    const req = makeRequest('cfi-token')
    const result = await requireCFI(req)
    expect('user' in result).toBe(true)
    expect('profile' in result).toBe(true)
  })

  test('returns { user, profile } when user is_admin is true (admin is superset of CFI)', async () => {
    const fakeUser = { id: 'admin-1' }
    const fakeProfile = { is_admin: true, is_instructor: false }
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null })
    mockSingle.mockResolvedValue({ data: fakeProfile, error: null })
    const req = makeRequest('admin-token')
    const result = await requireCFI(req)
    expect('user' in result).toBe(true)
    expect('profile' in result).toBe(true)
  })

  test('returns 403 when user has neither is_instructor nor is_admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null })
    mockSingle.mockResolvedValue({ data: { is_admin: false, is_instructor: false }, error: null })
    const req = makeRequest('student-token')
    const result = await requireCFI(req)
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(await getStatus(result.error)).toBe(403)
    }
  })
})

// ---------------------------------------------------------------------------
// requireUser
// ---------------------------------------------------------------------------

describe('requireUser', () => {
  test('returns 401 when Authorization header is missing', async () => {
    const req = makeRequest(undefined)
    const result = await requireUser(req)
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(await getStatus(result.error)).toBe(401)
    }
  })

  test('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') })
    const req = makeRequest('bad-token')
    const result = await requireUser(req)
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(await getStatus(result.error)).toBe(401)
    }
  })

  test('returns { user } when token is valid (no profile check)', async () => {
    const fakeUser = { id: 'student-1' }
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null })
    const req = makeRequest('student-token')
    const result = await requireUser(req)
    expect('user' in result).toBe(true)
    // requireUser must NOT call supabase.from (no profile lookup)
    expect(mockFrom).not.toHaveBeenCalled()
    if ('user' in result) {
      expect(result.user).toBe(fakeUser)
    }
  })
})
