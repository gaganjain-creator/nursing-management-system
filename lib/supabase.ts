import { createClient, SupabaseClient } from "@supabase/supabase-js"

export const DOCUMENTS_BUCKET = "nurse-documents"

/**
 * Server-side only — lazy singleton using SERVICE_ROLE_KEY.
 * Never import this in Client Components.
 */
let _serverClient: SupabaseClient | undefined

export function getSupabaseServer(): SupabaseClient {
  if (_serverClient) return _serverClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured")
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")

  _serverClient = createClient(url, key, { auth: { persistSession: false } })
  return _serverClient
}
