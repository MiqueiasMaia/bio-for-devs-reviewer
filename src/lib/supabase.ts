import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env, isEnvConfigured } from './env'

// Falls back to placeholder values when env vars are missing so this module
// never throws at import time; App.tsx blocks rendering the rest of the app
// (and therefore any real use of this client) via `isEnvConfigured`.
export const supabase = createClient<Database>(
  env.supabaseUrl ?? 'https://placeholder.supabase.co',
  env.supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)

export { isEnvConfigured }

if (import.meta.env.DEV) {
  // Lets you inspect the live session from the browser console during
  // local development: `await window.supabase.auth.getSession()`.
  ;(window as unknown as { supabase: typeof supabase }).supabase = supabase
}
