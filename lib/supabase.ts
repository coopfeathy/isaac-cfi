// Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  })
  throw new Error('Missing Supabase environment variables')
}

// Log for debugging (remove in production)
console.log('Supabase URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  is_admin: boolean
  created_at: string
}

export interface Slot {
  id: string
  start_time: string
  end_time: string
  type: 'training' | 'tour'
  price: number
  created_at: string
  is_booked: boolean
  description: string | null
}

export interface Booking {
  id: string
  slot_id: string | null
  user_id: string
  status: 'pending' | 'paid' | 'confirmed' | 'canceled' | 'completed'
  stripe_session_id: string | null
  created_at: string
  notes: string | null
}

export interface Post {
  id: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  published: boolean
  author_id: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

// CRM Types
export interface Prospect {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  meeting_location: string | null
  meeting_date: string | null
  notes: string | null
  interest_level: 'hot' | 'warm' | 'cold' | null
  status: 'active' | 'converted' | 'lost' | 'inactive'
  next_follow_up: string | null
  follow_up_frequency: number
  source: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Student {
  id: string
  user_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  certificate_type: string | null
  certificate_number: string | null
  medical_class: 'first' | 'second' | 'third' | 'basic_med' | null
  medical_expiration: string | null
  flight_review_date: string | null
  flight_review_due: string | null
  ipc_date: string | null
  ipc_due: string | null
  rental_checkout_date: string | null
  rental_currency_due: string | null
  total_hours: number
  pic_hours: number
  dual_hours: number
  instrument_hours: number
  training_stage: string | null
  notes: string | null
  status: 'active' | 'inactive' | 'completed' | 'on_hold'
  created_at: string
  updated_at: string
}

export interface Communication {
  id: string
  prospect_id: string | null
  student_id: string | null
  type: 'email' | 'sms' | 'phone' | 'in_person' | 'note'
  subject: string | null
  message: string | null
  sent_at: string
  sent_by: string | null
  status: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'opened'
}

export interface Reminder {
  id: string
  prospect_id: string | null
  student_id: string | null
  title: string
  description: string | null
  due_date: string
  reminder_type: 'follow_up' | 'flight_review' | 'ipc' | 'medical' | 'rental_currency' | 'custom' | null
  status: 'pending' | 'completed' | 'dismissed'
  created_at: string
  completed_at: string | null
}
