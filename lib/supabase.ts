// Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
