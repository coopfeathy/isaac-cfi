import { NextRequest } from 'next/server'

// Mock @upstash/ratelimit and @upstash/redis before importing the module under test
const mockLimit = jest.fn()
const mockRatelimitInstance = { limit: mockLimit }
const MockRatelimit = jest.fn(() => mockRatelimitInstance) as any
MockRatelimit.slidingWindow = jest.fn(() => 'sliding-window-config')

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: MockRatelimit,
}))

jest.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: jest.fn(() => ({})),
  },
}))

// Helper to reset module between tests that change env vars
function requireFresh() {
  jest.resetModules()
  jest.mock('@upstash/ratelimit', () => ({
    Ratelimit: MockRatelimit,
  }))
  jest.mock('@upstash/redis', () => ({
    Redis: {
      fromEnv: jest.fn(() => ({})),
    },
  }))
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../ratelimit')
}

describe('applyRateLimit', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns null when limit() returns success=true (request allowed)', async () => {
    mockLimit.mockResolvedValueOnce({ success: true })
    const { applyRateLimit } = requireFresh()

    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })

    const result = await applyRateLimit(request)
    expect(result).toBeNull()
  })

  it('returns NextResponse with status 429 when limit() returns success=false', async () => {
    mockLimit.mockResolvedValueOnce({ success: false })
    const { applyRateLimit } = requireFresh()

    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })

    const result = await applyRateLimit(request)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(429)

    const body = await result!.json()
    expect(body).toEqual({ error: 'Too many requests — please try again later.' })
  })

  it('returns null (fails open) when UPSTASH_REDIS_REST_URL env var is missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    const { applyRateLimit } = requireFresh()

    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })

    const result = await applyRateLimit(request)
    expect(result).toBeNull()
    // limit() should never have been called
    expect(mockLimit).not.toHaveBeenCalled()
  })
})
