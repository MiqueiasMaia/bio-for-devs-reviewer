import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types.js'

/**
 * Service-role client for server-only use inside Vercel Functions. Never
 * import this module (or ship SUPABASE_SERVICE_ROLE_KEY) from client code —
 * it bypasses RLS entirely.
 */
export function createAdminClient() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
