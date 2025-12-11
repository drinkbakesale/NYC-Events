import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Single user ID from environment
export const USER_ID = process.env.NEXT_PUBLIC_USER_ID!

// Database types
export interface Event {
  id: string
  title: string
  description: string | null
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  neighborhood: string | null
  city: string | null
  source_event_url: string | null
  created_via: string
  source_id: string | null
  hidden: boolean
  created_at: string
  updated_at: string
}

export interface Source {
  id: string
  domain: string
  display_name: string | null
  candidate_type: string
  status: string
  newsletter_signup_url: string | null
  times_seen_in_search: number
  created_at: string
}

export interface SourceToUnsubscribe {
  id: string
  domain: string
  display_name: string | null
  status: string
  newsletter_signup_url: string | null
  dislike_count: number
}

export interface UserEventReaction {
  id: string
  user_id: string
  event_id: string
  reaction: 'like' | 'dislike'
  created_at: string
}
