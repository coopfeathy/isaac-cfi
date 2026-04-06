/**
 * Tests for calendar TypeScript types (T02)
 * Validates that all exported types exist and are structurally correct.
 */

import type {
  InstructorAvailability,
  AvailabilityOverride,
  NotificationPreference,
  SlotRequest,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  CreateOverrideInput,
  SubmitSlotRequestInput,
  ApproveSlotRequestInput,
  DenySlotRequestInput,
  TimeBlockStatus,
  CalendarTimeBlock,
  CalendarDay,
  CalendarWeek,
  AdminCalendarTimeBlock,
  AdminCalendarDay,
  AvailableSlot,
  WeekAvailability,
  NotificationType,
  NotificationPayload,
} from '../calendar'

// === Database Row Types ===

describe('InstructorAvailability', () => {
  it('should accept a valid row shape', () => {
    const row: InstructorAvailability = {
      id: 'uuid-1',
      day_of_week: 1,
      start_time: '09:00:00',
      end_time: '17:00:00',
      is_active: true,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    }
    expect(row.day_of_week).toBe(1)
    expect(row.is_active).toBe(true)
  })
})

describe('AvailabilityOverride', () => {
  it('should accept a blocking override (no times)', () => {
    const override: AvailabilityOverride = {
      id: 'uuid-2',
      override_date: '2026-04-10',
      is_available: false,
      start_time: null,
      end_time: null,
      reason: 'Holiday',
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    }
    expect(override.is_available).toBe(false)
    expect(override.start_time).toBeNull()
  })

  it('should accept an extra-hours override (with times)', () => {
    const override: AvailabilityOverride = {
      id: 'uuid-3',
      override_date: '2026-04-12',
      is_available: true,
      start_time: '08:00:00',
      end_time: '12:00:00',
      reason: null,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    }
    expect(override.is_available).toBe(true)
    expect(override.start_time).toBe('08:00:00')
  })
})

describe('NotificationPreference', () => {
  it('should accept a valid preference row', () => {
    const pref: NotificationPreference = {
      id: 'uuid-4',
      user_id: 'user-uuid',
      email_enabled: true,
      sms_enabled: false,
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-01T00:00:00Z',
    }
    expect(pref.email_enabled).toBe(true)
    expect(pref.sms_enabled).toBe(false)
  })
})

describe('SlotRequest', () => {
  it('should accept all status values including canceled', () => {
    const statuses: SlotRequest['status'][] = ['pending', 'approved', 'denied', 'canceled']
    expect(statuses).toHaveLength(4)
  })

  it('should accept both request types', () => {
    const types: SlotRequest['request_type'][] = ['training', 'discovery_flight']
    expect(types).toHaveLength(2)
  })

  it('should accept a full slot request row', () => {
    const req: SlotRequest = {
      id: 'uuid-5',
      user_id: 'user-uuid',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      preferred_start_time: '2026-04-10T09:00:00Z',
      preferred_end_time: '2026-04-10T10:30:00Z',
      notes: null,
      source: 'website',
      status: 'pending',
      request_type: 'training',
      denial_reason: null,
      prospect_id: null,
      decision_notes: null,
      approved_slot_id: null,
      resolved_by: null,
      resolved_at: null,
      created_at: '2026-04-01T00:00:00Z',
    }
    expect(req.request_type).toBe('training')
    expect(req.status).toBe('pending')
  })
})

// === API Payload Types ===

describe('CreateAvailabilityInput', () => {
  it('should accept a valid input', () => {
    const input: CreateAvailabilityInput = {
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
    }
    expect(input.day_of_week).toBe(1)
  })
})

describe('UpdateAvailabilityInput', () => {
  it('should accept partial updates', () => {
    const input: UpdateAvailabilityInput = { is_active: false }
    expect(input.is_active).toBe(false)
  })
})

describe('CreateOverrideInput', () => {
  it('should accept a blocking override', () => {
    const input: CreateOverrideInput = {
      override_date: '2026-04-10',
      is_available: false,
      reason: 'Holiday',
    }
    expect(input.is_available).toBe(false)
  })

  it('should accept an extra-hours override', () => {
    const input: CreateOverrideInput = {
      override_date: '2026-04-12',
      is_available: true,
      start_time: '08:00',
      end_time: '12:00',
    }
    expect(input.start_time).toBe('08:00')
  })
})

describe('SubmitSlotRequestInput', () => {
  it('should accept a training request from authenticated student', () => {
    const input: SubmitSlotRequestInput = {
      preferred_start_time: '2026-04-10T09:00:00Z',
      preferred_end_time: '2026-04-10T10:30:00Z',
      request_type: 'training',
      notes: 'First lesson',
    }
    expect(input.request_type).toBe('training')
  })

  it('should accept a discovery flight request with prospect data', () => {
    const input: SubmitSlotRequestInput = {
      preferred_start_time: '2026-04-10T09:00:00Z',
      preferred_end_time: '2026-04-10T10:30:00Z',
      request_type: 'discovery_flight',
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-5678',
      prospect_id: 'prospect-uuid',
    }
    expect(input.request_type).toBe('discovery_flight')
    expect(input.full_name).toBe('Jane Doe')
  })
})

describe('ApproveSlotRequestInput', () => {
  it('should accept optional decision notes', () => {
    const input: ApproveSlotRequestInput = { decision_notes: 'Looks good' }
    expect(input.decision_notes).toBe('Looks good')
  })
})

describe('DenySlotRequestInput', () => {
  it('should require denial_reason', () => {
    const input: DenySlotRequestInput = { denial_reason: 'Schedule conflict' }
    expect(input.denial_reason).toBe('Schedule conflict')
  })
})

// === Calendar UI Types ===

describe('CalendarTimeBlock', () => {
  it('should accept all status values', () => {
    const statuses: TimeBlockStatus[] = ['available', 'busy', 'pending', 'approved', 'denied', 'blocked']
    expect(statuses).toHaveLength(6)
  })

  it('should accept a block with optional fields', () => {
    const block: CalendarTimeBlock = {
      start: '2026-04-10T09:00:00Z',
      end: '2026-04-10T10:00:00Z',
      status: 'available',
    }
    expect(block.slotRequestId).toBeUndefined()
    expect(block.bookingId).toBeUndefined()
    expect(block.label).toBeUndefined()
  })
})

describe('CalendarDay', () => {
  it('should contain date and blocks', () => {
    const day: CalendarDay = {
      date: '2026-04-10',
      blocks: [
        { start: '2026-04-10T09:00:00Z', end: '2026-04-10T10:00:00Z', status: 'available' },
      ],
    }
    expect(day.blocks).toHaveLength(1)
  })
})

describe('CalendarWeek', () => {
  it('should contain 7 days', () => {
    const days: CalendarDay[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-04-0${i + 6}`,
      blocks: [],
    }))
    const week: CalendarWeek = {
      startDate: '2026-04-06',
      endDate: '2026-04-12',
      days,
    }
    expect(week.days).toHaveLength(7)
  })
})

describe('AdminCalendarTimeBlock', () => {
  it('should extend CalendarTimeBlock with admin fields', () => {
    const block: AdminCalendarTimeBlock = {
      start: '2026-04-10T09:00:00Z',
      end: '2026-04-10T10:00:00Z',
      status: 'pending',
      studentName: 'John Doe',
      studentEmail: 'john@example.com',
      requestType: 'training',
      slotId: 'slot-uuid',
      caldavSynced: true,
    }
    expect(block.studentName).toBe('John Doe')
    expect(block.caldavSynced).toBe(true)
  })
})

describe('AdminCalendarDay', () => {
  it('should use AdminCalendarTimeBlock', () => {
    const day: AdminCalendarDay = {
      date: '2026-04-10',
      blocks: [
        {
          start: '2026-04-10T09:00:00Z',
          end: '2026-04-10T10:00:00Z',
          status: 'approved',
          studentName: 'John',
        },
      ],
    }
    expect(day.blocks[0].studentName).toBe('John')
  })
})

describe('AvailableSlot', () => {
  it('should accept a valid available slot', () => {
    const slot: AvailableSlot = {
      start: '2026-04-10T09:00:00Z',
      end: '2026-04-10T10:30:00Z',
      date: '2026-04-10',
    }
    expect(slot.date).toBe('2026-04-10')
  })
})

describe('WeekAvailability', () => {
  it('should contain week range and slots', () => {
    const week: WeekAvailability = {
      weekStart: '2026-04-06',
      weekEnd: '2026-04-12',
      availableSlots: [
        { start: '2026-04-10T09:00:00Z', end: '2026-04-10T10:30:00Z', date: '2026-04-10' },
      ],
    }
    expect(week.availableSlots).toHaveLength(1)
  })
})

// === Notification Types ===

describe('NotificationType', () => {
  it('should accept all notification types', () => {
    const types: NotificationType[] = [
      'request_submitted',
      'request_approved',
      'request_denied',
      'payment_link',
      'booking_confirmed',
      'reminder_24h',
      'cancellation_confirmed',
      'cancellation_alert',
    ]
    expect(types).toHaveLength(8)
  })
})

describe('NotificationPayload', () => {
  it('should accept a payload with user ID', () => {
    const payload: NotificationPayload = {
      type: 'request_approved',
      recipientUserId: 'user-uuid',
      data: { slotTime: '2026-04-10T09:00:00Z' },
    }
    expect(payload.type).toBe('request_approved')
  })

  it('should accept a payload with email/phone (no user ID)', () => {
    const payload: NotificationPayload = {
      type: 'request_submitted',
      recipientEmail: 'admin@merlinflight.com',
      recipientPhone: '555-0000',
      data: { requestId: 'req-uuid' },
    }
    expect(payload.recipientEmail).toBe('admin@merlinflight.com')
  })
})
