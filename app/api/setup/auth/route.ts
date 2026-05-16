import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Lo stato di autenticazione del Setup non e' piu' una password dedicata:
 * coincide con la sessione Supabase + flag utenti.is_admin. Questo endpoint
 * espone in lettura quello stato per i componenti client che lo chiedono.
 * Il vero gating sulle API e' fatto da requireAdmin() in /lib/setup-auth.ts.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ authenticated: false, reason: 'no_session' })
    }

    const { data: row } = await supabase
      .from('utenti')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (!row?.is_admin) {
      return NextResponse.json({ authenticated: false, reason: 'not_admin' })
    }

    return NextResponse.json({ authenticated: true })
  } catch {
    return NextResponse.json({ authenticated: false, reason: 'error' })
  }
}
