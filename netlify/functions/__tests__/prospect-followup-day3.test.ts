// Tests for prospect-followup-day3 Netlify scheduled function
// All tests must FAIL until production code is written (TDD RED phase)

const mockEmailsSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}))

// Build a chainable Supabase mock
function makeSupabaseMock(prospects: object[]) {
  const mockUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  })

  const selectChain = {
    gte: jest.fn(),
    lte: jest.fn(),
    lt: jest.fn(),
    in: jest.fn(),
  }

  // Each chained call returns the same object so we can chain .gte().lte().lt().in()
  selectChain.gte.mockReturnValue(selectChain)
  selectChain.lte.mockReturnValue(selectChain)
  selectChain.lt.mockReturnValue(selectChain)
  selectChain.in.mockResolvedValue({ data: prospects, error: null })

  const mockFrom = jest.fn((table: string) => {
    if (table === 'prospects') {
      return {
        select: jest.fn().mockReturnValue(selectChain),
        update: mockUpdate,
      }
    }
    return { select: jest.fn(), update: jest.fn(), insert: jest.fn() }
  })

  return { from: mockFrom, _mockUpdate: mockUpdate }
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@supabase/supabase-js'

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.RESEND_API_KEY = 'test-resend-key'
})

describe('prospect-followup-day3', () => {
  it('sends email to prospects with sequence_step=1 and updates sequence_step to 2', async () => {
    const prospects = [
      { id: 'p1', email: 'alice@example.com', full_name: 'Alice', lead_stage: 'new', sequence_step: 1 },
    ]
    const { from, _mockUpdate } = makeSupabaseMock(prospects)
    ;(createClient as jest.Mock).mockReturnValue({ from })
    mockEmailsSend.mockResolvedValue({ data: { id: 'e1' }, error: null })

    const { handler } = await import('../prospect-followup-day3')
    const result = await handler({} as any, {} as any, () => {})

    expect(result).toBeDefined()
    expect((result as any).statusCode).toBe(200)
    expect(mockEmailsSend).toHaveBeenCalledTimes(1)
    const sendArgs = mockEmailsSend.mock.calls[0][0]
    expect(sendArgs.to).toContain('alice@example.com')
    // sequence_step must be updated to 2
    expect(_mockUpdate).toHaveBeenCalledWith({ sequence_step: 2 })
  })

  it('skips prospects with sequence_step >= 2', async () => {
    // Prospects already at step 2 should not be returned by the query (filter is .lt('sequence_step', 2))
    // We simulate the DB returning empty set
    const { from } = makeSupabaseMock([])
    ;(createClient as jest.Mock).mockReturnValue({ from })

    const { handler } = await import('../prospect-followup-day3')
    const result = await handler({} as any, {} as any, () => {})

    expect((result as any).statusCode).toBe(200)
    expect(mockEmailsSend).not.toHaveBeenCalled()
  })

  it('skips prospects with lead_stage = converted', async () => {
    // Converted prospects filtered out by .in('lead_stage', ['new','contacted']) in query
    const { from } = makeSupabaseMock([])
    ;(createClient as jest.Mock).mockReturnValue({ from })

    const { handler } = await import('../prospect-followup-day3')
    const result = await handler({} as any, {} as any, () => {})

    expect((result as any).statusCode).toBe(200)
    expect(mockEmailsSend).not.toHaveBeenCalled()
  })

  it('response body contains sent count', async () => {
    const prospects = [
      { id: 'p1', email: 'bob@example.com', full_name: 'Bob', lead_stage: 'contacted', sequence_step: 1 },
    ]
    const { from } = makeSupabaseMock(prospects)
    ;(createClient as jest.Mock).mockReturnValue({ from })
    mockEmailsSend.mockResolvedValue({ data: { id: 'e2' }, error: null })

    const { handler } = await import('../prospect-followup-day3')
    const result = await handler({} as any, {} as any, () => {})

    const body = JSON.parse((result as any).body)
    expect(body.sent).toBe(1)
  })
})
