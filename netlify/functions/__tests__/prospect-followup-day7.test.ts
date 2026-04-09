// Tests for prospect-followup-day7 Netlify scheduled function
// All tests must FAIL until production code is written (TDD RED phase)

const mockEmailsSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}))

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

describe('prospect-followup-day7', () => {
  it('sends email to prospects with sequence_step=2 and updates sequence_step to 3', async () => {
    const prospects = [
      { id: 'p1', email: 'carol@example.com', full_name: 'Carol', lead_stage: 'new', sequence_step: 2 },
    ]
    const { from, _mockUpdate } = makeSupabaseMock(prospects)
    ;(createClient as jest.Mock).mockReturnValue({ from })
    mockEmailsSend.mockResolvedValue({ data: { id: 'e1' }, error: null })

    const { handler } = await import('../prospect-followup-day7')
    const result = await handler({} as any, {} as any, () => {})

    expect(result).toBeDefined()
    expect((result as any).statusCode).toBe(200)
    expect(mockEmailsSend).toHaveBeenCalledTimes(1)
    const sendArgs = mockEmailsSend.mock.calls[0][0]
    expect(sendArgs.to).toContain('carol@example.com')
    // sequence_step must be updated to 3
    expect(_mockUpdate).toHaveBeenCalledWith({ sequence_step: 3 })
  })

  it('skips prospects with sequence_step >= 3', async () => {
    // DB returns empty — already at step 3 filtered by .lt('sequence_step', 3)
    const { from } = makeSupabaseMock([])
    ;(createClient as jest.Mock).mockReturnValue({ from })

    const { handler } = await import('../prospect-followup-day7')
    const result = await handler({} as any, {} as any, () => {})

    expect((result as any).statusCode).toBe(200)
    expect(mockEmailsSend).not.toHaveBeenCalled()
  })

  it('response body contains sent count', async () => {
    const prospects = [
      { id: 'p2', email: 'dave@example.com', full_name: 'Dave', lead_stage: 'contacted', sequence_step: 2 },
    ]
    const { from } = makeSupabaseMock(prospects)
    ;(createClient as jest.Mock).mockReturnValue({ from })
    mockEmailsSend.mockResolvedValue({ data: { id: 'e3' }, error: null })

    const { handler } = await import('../prospect-followup-day7')
    const result = await handler({} as any, {} as any, () => {})

    const body = JSON.parse((result as any).body)
    expect(body.sent).toBe(1)
  })
})
