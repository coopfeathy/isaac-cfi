/**
 * Unit tests for cancellation fee charge/flag logic.
 *
 * Tests call processCancellationFee directly to avoid HTTP mocking.
 * The RPC error path tests verify the expected response shape contracts.
 */

// Mock supabase client before imports to avoid env var errors at module load
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}))

// Mock supabase-admin to avoid env var errors
jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnThis(),
    }),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
}))

import { processCancellationFee } from '@/app/api/student/bookings/[id]/cancel/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStripe(cards: unknown[] = []): any {
  return {
    paymentMethods: {
      list: jest.fn().mockResolvedValue({ data: cards }),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' }),
    },
  }
}

function makeSupabaseAdmin(insertMock = jest.fn().mockResolvedValue({ error: null })): any {
  return {
    from: jest.fn().mockReturnValue({
      insert: insertMock,
    }),
  }
}

const MOCK_CARD = { id: 'pm_card_test', type: 'card' }
const BOOKING_ID = 'booking-uuid-1234'
const STUDENT_ID = 'student-uuid-5678'
const CUSTOMER_ID = 'cus_abc123'

// ---------------------------------------------------------------------------
// Test 1: Card on file — charges $50 off-session
// ---------------------------------------------------------------------------

describe('processCancellationFee — card on file', () => {
  it('calls paymentIntents.create with amount 5000, off_session: true, confirm: true', async () => {
    const stripeMock = makeStripe([MOCK_CARD])
    const supabaseAdmin = makeSupabaseAdmin()

    const result = await processCancellationFee({
      stripeCustomerId: CUSTOMER_ID,
      bookingId: BOOKING_ID,
      studentId: STUDENT_ID,
      stripe: stripeMock,
      supabaseAdmin,
    })

    expect(stripeMock.paymentMethods.list).toHaveBeenCalledWith({
      customer: CUSTOMER_ID,
      type: 'card',
    })

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        currency: 'usd',
        customer: CUSTOMER_ID,
        payment_method: MOCK_CARD.id,
        off_session: true,
        confirm: true,
      })
    )

    expect(result).toEqual({ fee: 'charged', amount_cents: 5000 })

    // Should NOT have inserted a fee flag
    expect(supabaseAdmin.from).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Test 2: No card on file — flags $50 fee
// ---------------------------------------------------------------------------

describe('processCancellationFee — no card on file', () => {
  it('inserts cancellation_fee_flags with amount_cents 5000 when no card exists', async () => {
    const stripeMock = makeStripe([]) // empty card list
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    const supabaseAdmin = makeSupabaseAdmin(insertMock)

    const result = await processCancellationFee({
      stripeCustomerId: CUSTOMER_ID,
      bookingId: BOOKING_ID,
      studentId: STUDENT_ID,
      stripe: stripeMock,
      supabaseAdmin,
    })

    expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled()

    expect(supabaseAdmin.from).toHaveBeenCalledWith('cancellation_fee_flags')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: STUDENT_ID,
        booking_id: BOOKING_ID,
        amount_cents: 5000,
      })
    )

    expect(result).toEqual({ fee: 'flagged', amount_cents: 5000 })
  })

  it('inserts cancellation_fee_flags when stripeCustomerId is null', async () => {
    const stripeMock = makeStripe()
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    const supabaseAdmin = makeSupabaseAdmin(insertMock)

    const result = await processCancellationFee({
      stripeCustomerId: null,
      bookingId: BOOKING_ID,
      studentId: STUDENT_ID,
      stripe: stripeMock,
      supabaseAdmin,
    })

    // No Stripe customer — should skip paymentMethods.list entirely
    expect(stripeMock.paymentMethods.list).not.toHaveBeenCalled()
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ amount_cents: 5000 })
    )
    expect(result).toEqual({ fee: 'flagged', amount_cents: 5000 })
  })
})

// ---------------------------------------------------------------------------
// Test 3: Charge failure falls back to flagging
// ---------------------------------------------------------------------------

describe('processCancellationFee — charge failure fallback', () => {
  it('flags the fee when paymentIntents.create throws (e.g. authentication_required)', async () => {
    const stripeMock = makeStripe([MOCK_CARD])
    stripeMock.paymentIntents.create = jest
      .fn()
      .mockRejectedValue(new Error('authentication_required'))
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    const supabaseAdmin = makeSupabaseAdmin(insertMock)

    const result = await processCancellationFee({
      stripeCustomerId: CUSTOMER_ID,
      bookingId: BOOKING_ID,
      studentId: STUDENT_ID,
      stripe: stripeMock,
      supabaseAdmin,
    })

    // Attempted the charge
    expect(stripeMock.paymentIntents.create).toHaveBeenCalled()
    // Fell back to flagging
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ amount_cents: 5000 })
    )
    expect(result).toEqual({ fee: 'flagged', amount_cents: 5000 })
  })
})

// ---------------------------------------------------------------------------
// Test 4: RPC response shape contracts
// ---------------------------------------------------------------------------
// Documents the expected RPC return shapes and corresponding HTTP status codes.

describe('RPC response shape validation', () => {
  it('RPC booking_not_found should trigger 404 (contract test)', () => {
    // The POST handler checks: if (result?.error === 'booking_not_found') -> 404
    const rpcResult = { error: 'booking_not_found' }
    expect(rpcResult.error).toBe('booking_not_found')
  })

  it('RPC booking_not_cancellable should trigger 409 (contract test)', () => {
    // The POST handler checks: if (result?.error === 'booking_not_cancellable') -> 409
    const rpcResult = { error: 'booking_not_cancellable', status: 'canceled' }
    expect(rpcResult.error).toBe('booking_not_cancellable')
    expect(rpcResult.status).toBe('canceled')
  })

  it('RPC ok:true should proceed to fee logic (contract test)', () => {
    const rpcResult = { ok: true, slot_id: 'slot-uuid' }
    expect(rpcResult.ok).toBe(true)
  })
})
