// === Database Row Types ===

export interface InstructorAvailability {
  id: string
  instructor_id: string  // UUID of the owning CFI
  day_of_week: number // 0=Sunday, 6=Saturday
  start_time: string  // "HH:MM:SS" format from Postgres TIME
  end_time: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AvailabilityOverride {
  id: string
  override_date: string // "YYYY-MM-DD"
  is_available: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  email_enabled: boolean
  sms_enabled: boolean
  created_at: string
  updated_at: string
}

// Extended SlotRequest (with new columns)
export interface SlotRequest {
  id: string
  user_id: string | null
  full_name: string
  email: string
  phone: string
  preferred_start_time: string
  preferred_end_time: string
  notes: string | null
  source: string | null
  status: 'pending' | 'approved' | 'denied' | 'canceled'
  request_type: 'training' | 'discovery_flight'
  denial_reason: string | null
  prospect_id: string | null
  decision_notes: string | null
  approved_slot_id: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

// === API Payload Types ===

// Create availability template entry
export interface CreateAvailabilityInput {
  day_of_week: number
  start_time: string // "HH:MM"
  end_time: string
}

export interface UpdateAvailabilityInput {
  is_active?: boolean
  start_time?: string
  end_time?: string
}

// Create override
export interface CreateOverrideInput {
  override_date: string // "YYYY-MM-DD"
  is_available: boolean
  start_time?: string // required if is_available=true
  end_time?: string
  reason?: string
}

// Submit slot request (student)
export interface SubmitSlotRequestInput {
  preferred_start_time: string // ISO 8601
  preferred_end_time: string
  request_type: 'training' | 'discovery_flight'
  notes?: string
  // For discovery flights (unauthenticated):
  full_name?: string
  email?: string
  phone?: string
  prospect_id?: string
}

// Admin approve/deny
export interface ApproveSlotRequestInput {
  decision_notes?: string
}

export interface DenySlotRequestInput {
  denial_reason: string
}

// === Calendar UI Types ===

export type TimeBlockStatus = 'available' | 'busy' | 'pending' | 'approved' | 'denied' | 'blocked'

export interface CalendarTimeBlock {
  start: string // ISO 8601
  end: string
  status: TimeBlockStatus
  slotRequestId?: string
  bookingId?: string
  label?: string
}

export interface CalendarDay {
  date: string // "YYYY-MM-DD"
  blocks: CalendarTimeBlock[]
}

export interface CalendarWeek {
  startDate: string // Monday of the week
  endDate: string   // Sunday of the week
  days: CalendarDay[]
}

// Admin-specific (includes student names, request details)
export interface AdminCalendarTimeBlock extends CalendarTimeBlock {
  studentName?: string
  studentEmail?: string
  requestType?: 'training' | 'discovery_flight'
  slotId?: string
  caldavSynced?: boolean
}

export interface AdminCalendarDay {
  date: string
  blocks: AdminCalendarTimeBlock[]
}

// Availability engine output
export interface AvailableSlot {
  start: string // ISO 8601
  end: string
  date: string  // "YYYY-MM-DD"
}

export interface WeekAvailability {
  weekStart: string
  weekEnd: string
  availableSlots: AvailableSlot[]
}

// Notification types
export type NotificationType =
  | 'request_submitted'
  | 'request_approved'
  | 'request_denied'
  | 'payment_link'
  | 'booking_confirmed'
  | 'reminder_24h'
  | 'cancellation_confirmed'
  | 'cancellation_alert'

export interface NotificationPayload {
  type: NotificationType
  recipientUserId?: string
  recipientEmail?: string
  recipientPhone?: string
  data: Record<string, unknown>
}
