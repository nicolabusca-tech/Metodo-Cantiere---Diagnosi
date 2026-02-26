import { createBrowserClient } from '@supabase/ssr'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // 400 giorni in secondi

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  )
}
