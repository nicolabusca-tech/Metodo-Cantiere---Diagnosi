import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { normalizeDiagnosiForStorage } from "@/lib/diagnosi-content"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const REVIEW_SELECT =
  "id, user_id, tipo, diagnosi, volume_1, volume_2, volume_3, enabled, progresso, created_at, updated_at"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 400 })
  }

  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from("diagnosi")
    .select(REVIEW_SELECT)
    .eq("secret_token", token)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[review-api] Error fetching diagnosi:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Diagnosi non trovata" }, { status: 404 })
  }

  return NextResponse.json({ success: true, diagnosi: data })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 400 })
  }

  const supabase = getAdminClient()

  const { data: existing, error: existingError } = await supabase
    .from("diagnosi")
    .select("tipo")
    .eq("secret_token", token)
    .maybeSingle()

  if (existingError) {
    console.error("[review-api] Error fetching diagnosi tipo:", existingError)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json({ error: "Diagnosi non trovata" }, { status: 404 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (existing.tipo === "diagnosi_strategica") {
    for (const key of ["volume_1", "volume_2", "volume_3"] as const) {
      if (typeof body[key] === "string") {
        updates[key] = normalizeDiagnosiForStorage(body[key])
      }
    }
  } else if (typeof body.diagnosi === "string") {
    updates.diagnosi = normalizeDiagnosiForStorage(body.diagnosi)
  }

  if (typeof body.enabled === "boolean") {
    updates.enabled = body.enabled
  }

  const payloadKeys = Object.keys(updates).filter((k) => k !== "updated_at")
  if (payloadKeys.length === 0) {
    return NextResponse.json(
      {
        error:
          "Nessun campo valido da aggiornare (diagnosi, volume_1..3, enabled)",
      },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("diagnosi")
    .update(updates)
    .eq("secret_token", token)
    .select(REVIEW_SELECT)
    .single()

  if (error) {
    console.error("[review-api] Error updating diagnosi:", error)
    return NextResponse.json({ error: "Errore durante l'aggiornamento" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Diagnosi non trovata" }, { status: 404 })
  }

  return NextResponse.json({ success: true, diagnosi: data })
}
