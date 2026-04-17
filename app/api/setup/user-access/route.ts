import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

const COOKIE_NAME = 'setup_session'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const SELECT_COLS =
  'id,email,nome,cognome,azienda,paid_analisi,paid_diagnosi,access_omaggio_analisi,access_omaggio_diagnosi,form_status_analisi,form_status_diagnosi'

/** Se la migrazione 018 non è stata applicata, PostgREST segnala colonna assente (42703). */
const SELECT_COLS_WITHOUT_OMAGGIO =
  'id,email,nome,cognome,azienda,paid_analisi,paid_diagnosi,form_status_analisi,form_status_diagnosi'

function isMissingOmaggioColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === '42703') return true
  const m = err.message ?? ''
  return m.includes('access_omaggio_analisi') || m.includes('access_omaggio_diagnosi')
}

async function isSetupAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return !!cookieStore.get(COOKIE_NAME)?.value
}

export async function GET(request: NextRequest) {
  if (!(await isSetupAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const supabase = createAdminClient()

  const list = searchParams.get('list')
  if (list === '1' || list === 'true') {
    let { data, error } = await supabase
      .from('utenti')
      .select(SELECT_COLS)
      .order('email', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })

    if (error && isMissingOmaggioColumnError(error)) {
      const retry = await supabase
        .from('utenti')
        .select(SELECT_COLS_WITHOUT_OMAGGIO)
        .order('email', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error('[setup/user-access] GET list:', error)
      return NextResponse.json({ error: 'Errore nel caricamento elenco' }, { status: 500 })
    }

    const rows = (data ?? []) as Record<string, unknown>[]
    const users = rows.map((r) => ({
      ...r,
      access_omaggio_analisi: r.access_omaggio_analisi ?? false,
      access_omaggio_diagnosi: r.access_omaggio_diagnosi ?? false,
    }))

    return NextResponse.json({ data: { users } })
  }

  const raw = searchParams.get('q')?.trim() ?? ''
  if (!raw) {
    return NextResponse.json(
      { error: 'Parametro q obbligatorio (oppure list=1 per tutti gli utenti)' },
      { status: 400 }
    )
  }

  if (UUID_REGEX.test(raw)) {
    const { data, error } = await supabase.from('utenti').select(SELECT_COLS).eq('id', raw).maybeSingle()

    if (error) {
      console.error('[setup/user-access] GET by id:', error)
      return NextResponse.json({ error: 'Errore nel caricamento' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }
    return NextResponse.json({ data: { user: data } })
  }

  const { data: rows, error } = await supabase.from('utenti').select(SELECT_COLS).ilike('email', raw)

  if (error) {
    console.error('[setup/user-access] GET by email:', error)
    return NextResponse.json({ error: 'Errore nel caricamento' }, { status: 500 })
  }
  if (!rows?.length) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }
  if (rows.length > 1) {
    return NextResponse.json(
      {
        error: 'Email ambigua: più account trovati. Usa UUID utente (Supabase Auth).',
        matches: rows.slice(0, 10).map((r) => ({ id: r.id, email: r.email })),
      },
      { status: 400 }
    )
  }

  return NextResponse.json({ data: { user: rows[0] } })
}

export async function PATCH(request: NextRequest) {
  if (!(await isSetupAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const hasAnalisi = 'analisi' in body
  const hasDiagnosi = 'diagnosi' in body

  if (!userId) {
    return NextResponse.json({ error: 'userId obbligatorio' }, { status: 400 })
  }
  if (!hasAnalisi && !hasDiagnosi) {
    return NextResponse.json({ error: 'Specificare almeno analisi o diagnosi' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (hasAnalisi) {
    updates.access_omaggio_analisi = Boolean(body.analisi)
  }
  if (hasDiagnosi) {
    updates.access_omaggio_diagnosi = Boolean(body.diagnosi)
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('utenti')
    .update(updates)
    .eq('id', userId)
    .select(SELECT_COLS)
    .maybeSingle()

  if (error) {
    console.error('[setup/user-access] PATCH:', error)
    if (isMissingOmaggioColumnError(error)) {
      return NextResponse.json(
        {
          error:
            'Colonne omaggio assenti sul database. Esegui lo script scripts/018_utenti_access_omaggio.sql su Supabase, poi riprova.',
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Errore nell\'aggiornamento' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  return NextResponse.json({ data: { user: data } })
}
