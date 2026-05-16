import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type AdminAuthOk = { ok: true; userId: string; email: string | null }
export type AdminAuthFail = { ok: false; response: NextResponse }
export type AdminAuthResult = AdminAuthOk | AdminAuthFail

/**
 * Gate per gli endpoint /api/setup/*.
 * Sostituisce la vecchia SETUP_PASSWORD: ora un endpoint amministrativo
 * risponde solo se la sessione Supabase appartiene a un utente con
 * utenti.is_admin = true.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }),
    }
  }

  const { data: row, error: rowError } = await supabase
    .from('utenti')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (rowError) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Verifica permessi fallita' },
        { status: 500 },
      ),
    }
  }

  if (!row?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Accesso negato' }, { status: 403 }),
    }
  }

  return { ok: true, userId: user.id, email: user.email ?? null }
}
