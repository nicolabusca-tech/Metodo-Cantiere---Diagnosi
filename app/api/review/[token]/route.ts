import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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
    .select("id, user_id, tipo, diagnosi, enabled, created_at, updated_at")
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

  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.diagnosi === "string") {
    updates.diagnosi = body.diagnosi
  }
  if (typeof body.enabled === "boolean") {
    updates.enabled = body.enabled
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json(
      { error: "Nessun campo valido da aggiornare (diagnosi, enabled)" },
      { status: 400 }
    )
  }

  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from("diagnosi")
    .update(updates)
    .eq("secret_token", token)
    .select("id, user_id, tipo, diagnosi, enabled, created_at, updated_at")
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
