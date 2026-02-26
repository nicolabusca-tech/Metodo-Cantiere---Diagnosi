import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const COOKIE_OPTIONS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 400, // 400 giorni - persistenza oltre la chiusura del browser
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...COOKIE_OPTIONS, ...options }),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
      cookieOptions: COOKIE_OPTIONS,
    },
  )
}
