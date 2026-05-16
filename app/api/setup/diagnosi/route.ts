import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/setup-auth'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const supabase = createAdminClient()

    const { data: diagnosiList, error: diagnosiError } = await supabase
      .from('diagnosi')
      .select('id, user_id, tipo, secret_token, enabled, progresso, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (diagnosiError) {
      throw diagnosiError
    }

    const list = diagnosiList ?? []

    if (list.length === 0) {
      return NextResponse.json({ diagnosi: [] })
    }

    const userIds = [...new Set(list.map((d) => d.user_id))]

    const { data: utentiList, error: utentiError } = await supabase
      .from('utenti')
      .select('id, email, nome, cognome, azienda')
      .in('id', userIds)

    const utentiMap = new Map<string, { email?: string; nome?: string; cognome?: string; azienda?: string }>()
    if (!utentiError && utentiList) {
      for (const u of utentiList) {
        utentiMap.set(u.id, {
          email: u.email,
          nome: u.nome,
          cognome: u.cognome,
          azienda: u.azienda,
        })
      }
    }

    const diagnosiWithUser = list.map((d) => {
      const u = utentiMap.get(d.user_id)
      const userLabel = u?.email ?? u?.nome ? `${u.nome} ${u.cognome || ''}`.trim() : null
      return {
        ...d,
        user_email: u?.email ?? null,
        user_label: userLabel ?? `ID: ${d.user_id.slice(0, 8)}...`,
      }
    })

    return NextResponse.json({ diagnosi: diagnosiWithUser })
  } catch (err) {
    console.error('[setup/diagnosi] GET error:', err)
    return NextResponse.json({ error: 'Errore nel caricamento' }, { status: 500 })
  }
}
