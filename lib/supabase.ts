import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Server-side only — uses SERVICE_ROLE_KEY.
 * Never import this in Client Components.
 */
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})

/**
 * Safe for Client Components — uses ANON_KEY.
 */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey)

export const DOCUMENTS_BUCKET = "nurse-documents"
