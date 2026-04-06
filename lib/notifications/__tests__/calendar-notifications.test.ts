import { sendCalendarNotification } from '../calendar-notifications'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockSend = jest.fn().mockResolvedValue({ id: 'email-123' })
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}))

const mockSendTwilioMessage = jest.fn().mockResolvedValue({ sid: 'sms-123' })
jest.mock('@/lib/twilio', () => ({
  sendTwilioMessage: (...args: unknown[]) => mockSendTwilioMessage(...args),
}))

const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn()

jest.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return { select: mockSelect }
    },
    auth: {
      admin: {
        getUserById: jest.fn().mockResolvedValue({
          data: { user: { email: 'student@test.com' } },
          error: null,
        }),
      },
    },
  }),
}))

// ── Setup ──────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@merlin.com'
const ADMIN_PHONE = '+15551234567'

beforeAll(() => {
  process.env.RESEND_API_KEY = 'test-key'
  process.env.ADMIN_EMAIL = ADMIN_EMAIL
  process.env.ADMIN_PHONE = ADMIN_PHONE
  process.env.NEXT_PUBLIC_SITE_URL = 'https://merlinflighttraining.com'
})

beforeEach(() => {
  jest.clearAllMocks()

  // Default chain: profiles table lookup returns student data
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle })
  mockSingle.mockResolvedValue({
    data: { full_name: 'Test Student', phone: '+15559876543' },
    error: null,
  })

  // Override for notification_preferences table
  mockFrom.mockImplementation((table: string) => {
    if (table === 'notification_preferences') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { email_enabled: true, sms_enabled: true },
              error: null,
            }),
          }),
        }),
      }
    }
    // profiles table
    return { select: mockSelect }
  })
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('sendCalendarNotification', () => {
  describe('request_submitted (admin notification)', () => {
    it('sends email + SMS to admin regardless of preferences', async () => {
      const result = await sendCalendarNotification({
        type: 'request_submitted',
        data: {
          studentName: 'Jane Doe',
          slotRequestType: 'discovery_flight',
          date: 'April 15, 2026',
          time: '8:00 AM - 10:00 AM',
          requestId: 'req-001',
          adminActionUrl: 'https://merlinflighttraining.com/admin/requests/req-001',
        },
      })

      expect(result.emailSent).toBe(true)
      expect(result.smsSent).toBe(true)

      // Email sent to admin
      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [ADMIN_EMAIL],
          subject: expect.stringContaining('Discovery'),
        })
      )

      // SMS sent to admin
      expect(mockSendTwilioMessage).toHaveBeenCalledTimes(1)
      expect(mockSendTwilioMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ADMIN_PHONE,
          body: expect.stringContaining('Jane Doe'),
        })
      )
    })
  })

  describe('request_approved (student notification)', () => {
    it('sends email + SMS to student when both enabled', async () => {
      const result = await sendCalendarNotification({
        type: 'request_approved',
        recipientUserId: 'user-123',
        data: {
          slotRequestType: 'training',
          date: 'April 15, 2026',
          time: '8:00 AM - 10:00 AM',
        },
      })

      expect(result.emailSent).toBe(true)
      expect(result.smsSent).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Approved'),
        })
      )
    })

    it('sends only email when SMS disabled', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { email_enabled: true, sms_enabled: false },
                  error: null,
                }),
              }),
            }),
          }
        }
        return { select: mockSelect }
      })

      const result = await sendCalendarNotification({
        type: 'request_approved',
        recipientUserId: 'user-123',
        data: {
          slotRequestType: 'training',
          date: 'April 15, 2026',
          time: '8:00 AM - 10:00 AM',
        },
      })

      expect(result.emailSent).toBe(true)
      expect(result.smsSent).toBe(false)
      expect(mockSendTwilioMessage).not.toHaveBeenCalled()
    })
  })

  describe('request_denied (student notification)', () => {
    it('includes denial reason in email', async () => {
      await sendCalendarNotification({
        type: 'request_denied',
        recipientUserId: 'user-123',
        data: {
          date: 'April 15, 2026',
          time: '8:00 AM - 10:00 AM',
          denialReason: 'Weather conditions',
        },
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Weather conditions'),
        })
      )
    })
  })

  describe('payment_link (student notification)', () => {
    it('includes payment URL in email', async () => {
      await sendCalendarNotification({
        type: 'payment_link',
        recipientUserId: 'user-123',
        data: {
          date: 'April 15, 2026',
          time: '8:00 AM - 10:00 AM',
          paymentUrl: 'https://checkout.stripe.com/pay/abc123',
        },
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://checkout.stripe.com/pay/abc123'),
        })
      )
    })
  })

  describe('booking_confirmed (student notification)', () => {
    it('sends confirmation email + SMS', async () => {
      const result = await sendCalendarNotification({
        type: 'booking_confirmed',
        recipientUserId: 'user-123',
        data: {
          date: 'April 15, 2026',
          time: '8:00 AM - 10:00 AM',
        },
      })

      expect(result.emailSent).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Confirmed'),
        })
      )
    })
  })

  describe('reminder_24h (student notification)', () => {
    it('sends reminder with time and arrive-early note', async () => {
      await sendCalendarNotification({
        type: 'reminder_24h',
        recipientUserId: 'user-123',
        data: {
          date: 'April 15, 2026',
          time: '8:00 AM',
          studentName: 'Jane Doe',
        },
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Reminder'),
          html: expect.stringContaining('15 minutes early'),
        })
      )
      expect(mockSendTwilioMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('15 min early'),
        })
      )
    })
  })

  describe('cancellation_confirmed (student notification)', () => {
    it('sends cancellation confirmation to student', async () => {
      const result = await sendCalendarNotification({
        type: 'cancellation_confirmed',
        recipientUserId: 'user-123',
        data: {
          date: 'April 15, 2026',
          time: '8:00 AM - 10:00 AM',
        },
      })

      expect(result.emailSent).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Cancellation'),
        })
      )
    })
  })

  describe('cancellation_alert (admin notification)', () => {
    it('sends alert to admin with late cancellation flag', async () => {
      await sendCalendarNotification({
        type: 'cancellation_alert',
        data: {
          studentName: 'Jane Doe',
          date: 'April 15, 2026',
          time: '8:00 AM - 10:00 AM',
          isLateCancellation: true,
        },
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [ADMIN_EMAIL],
          subject: expect.stringContaining('Cancellation'),
          html: expect.stringContaining('Late Cancellation'),
        })
      )
      expect(mockSendTwilioMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ADMIN_PHONE,
        })
      )
    })
  })

  describe('prospect (no user account)', () => {
    it('sends to recipientEmail/recipientPhone directly', async () => {
      const result = await sendCalendarNotification({
        type: 'request_approved',
        recipientEmail: 'prospect@test.com',
        recipientPhone: '+15550001111',
        data: {
          slotRequestType: 'discovery_flight',
          date: 'April 20, 2026',
          time: '10:00 AM - 11:30 AM',
        },
      })

      expect(result.emailSent).toBe(true)
      expect(result.smsSent).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['prospect@test.com'],
        })
      )
      expect(mockSendTwilioMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+15550001111',
        })
      )
    })
  })

  describe('error handling', () => {
    it('catches email errors and returns emailSent=false', async () => {
      mockSend.mockRejectedValueOnce(new Error('Resend API down'))

      const result = await sendCalendarNotification({
        type: 'request_approved',
        recipientEmail: 'test@test.com',
        data: {
          date: 'April 15, 2026',
          time: '8:00 AM',
        },
      })

      expect(result.emailSent).toBe(false)
    })

    it('catches SMS errors and returns smsSent=false', async () => {
      mockSendTwilioMessage.mockRejectedValueOnce(new Error('Twilio down'))

      const result = await sendCalendarNotification({
        type: 'reminder_24h',
        recipientEmail: 'test@test.com',
        recipientPhone: '+15550001111',
        data: {
          date: 'April 15, 2026',
          time: '8:00 AM',
        },
      })

      expect(result.emailSent).toBe(true)
      expect(result.smsSent).toBe(false)
    })

    it('defaults to both enabled when no notification_preferences record', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }
        }
        return { select: mockSelect }
      })

      const result = await sendCalendarNotification({
        type: 'request_approved',
        recipientUserId: 'user-123',
        data: {
          date: 'April 15, 2026',
          time: '8:00 AM',
        },
      })

      expect(result.emailSent).toBe(true)
      expect(result.smsSent).toBe(true)
    })
  })
})
