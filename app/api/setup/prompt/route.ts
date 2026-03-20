import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

const COOKIE_NAME = 'setup_session'

type TipoPrompt = 'analisi_lampo' | 'diagnosi_strategica'

type PromptSetupRow = {
  tipo: TipoPrompt
  prompt_generale: string
  prompt_competitor: string
  prompt_riscrittura: string
  prompt_ricerca_azienda_cliente: string
  prompt_ricerca_competitor: string
  prompt_mercato_locale: string
  prompt_volume_1: string
  prompt_volume_2: string
  prompt_volume_3: string
  prompt_impaginazione: string
}

function emptyRow(tipo: TipoPrompt): PromptSetupRow {
  return {
    tipo,
    prompt_generale: '',
    prompt_competitor: '',
    prompt_riscrittura: '',
    prompt_ricerca_azienda_cliente: '',
    prompt_ricerca_competitor: '',
    prompt_mercato_locale: '',
    prompt_volume_1: '',
    prompt_volume_2: '',
    prompt_volume_3: '',
    prompt_impaginazione: '',
  }
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function normalizeRow(raw: Record<string, unknown> | null, tipo: TipoPrompt): PromptSetupRow {
  const base = emptyRow(tipo)
  if (!raw) return base
  return {
    tipo,
    prompt_generale: asStr(raw.prompt_generale, base.prompt_generale),
    prompt_competitor: asStr(raw.prompt_competitor, base.prompt_competitor),
    prompt_riscrittura: asStr(raw.prompt_riscrittura, base.prompt_riscrittura),
    prompt_ricerca_azienda_cliente: asStr(
      raw.prompt_ricerca_azienda_cliente,
      base.prompt_ricerca_azienda_cliente
    ),
    prompt_ricerca_competitor: asStr(raw.prompt_ricerca_competitor, base.prompt_ricerca_competitor),
    prompt_mercato_locale: asStr(raw.prompt_mercato_locale, base.prompt_mercato_locale),
    prompt_volume_1: asStr(raw.prompt_volume_1, base.prompt_volume_1),
    prompt_volume_2: asStr(raw.prompt_volume_2, base.prompt_volume_2),
    prompt_volume_3: asStr(raw.prompt_volume_3, base.prompt_volume_3),
    prompt_impaginazione: asStr(raw.prompt_impaginazione, base.prompt_impaginazione),
  }
}

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)
  return !!session?.value
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo') as TipoPrompt | null

  if (!tipo || !['analisi_lampo', 'diagnosi_strategica'].includes(tipo)) {
    return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('prompt_setup')
      .select('*')
      .eq('tipo', tipo)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({
      data: normalizeRow((data as Record<string, unknown> | null) ?? null, tipo),
    })
  } catch (err) {
    console.error('[setup/prompt] GET error:', err)
    return NextResponse.json({ error: 'Errore nel caricamento' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const tipo = body.tipo as TipoPrompt | undefined

    if (!tipo || !['analisi_lampo', 'diagnosi_strategica'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: existingRaw, error: fetchError } = await supabase
      .from('prompt_setup')
      .select('*')
      .eq('tipo', tipo)
      .maybeSingle()

    if (fetchError) throw fetchError

    const existing = normalizeRow((existingRaw as Record<string, unknown> | null) ?? null, tipo)

    let row: PromptSetupRow

    if (tipo === 'analisi_lampo') {
      row = {
        tipo: 'analisi_lampo',
        prompt_generale: asStr(body.prompt_generale, existing.prompt_generale),
        prompt_competitor: asStr(body.prompt_competitor, existing.prompt_competitor),
        prompt_riscrittura: asStr(body.prompt_riscrittura, existing.prompt_riscrittura),
        prompt_ricerca_azienda_cliente: existing.prompt_ricerca_azienda_cliente,
        prompt_ricerca_competitor: existing.prompt_ricerca_competitor,
        prompt_mercato_locale: existing.prompt_mercato_locale,
        prompt_volume_1: existing.prompt_volume_1,
        prompt_volume_2: existing.prompt_volume_2,
        prompt_volume_3: existing.prompt_volume_3,
        prompt_impaginazione: existing.prompt_impaginazione,
      }
    } else {
      row = {
        tipo: 'diagnosi_strategica',
        prompt_generale: '',
        prompt_competitor: '',
        prompt_riscrittura: '',
        prompt_ricerca_azienda_cliente: asStr(
          body.prompt_ricerca_azienda_cliente,
          existing.prompt_ricerca_azienda_cliente
        ),
        prompt_ricerca_competitor: asStr(
          body.prompt_ricerca_competitor,
          existing.prompt_ricerca_competitor
        ),
        prompt_mercato_locale: asStr(body.prompt_mercato_locale, existing.prompt_mercato_locale),
        prompt_volume_1: asStr(body.prompt_volume_1, existing.prompt_volume_1),
        prompt_volume_2: asStr(body.prompt_volume_2, existing.prompt_volume_2),
        prompt_volume_3: asStr(body.prompt_volume_3, existing.prompt_volume_3),
        prompt_impaginazione: asStr(body.prompt_impaginazione, existing.prompt_impaginazione),
      }
    }

    const { error } = await supabase.from('prompt_setup').upsert(row, { onConflict: 'tipo' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[setup/prompt] PUT error:', err)
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }
}
