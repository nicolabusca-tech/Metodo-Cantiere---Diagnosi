import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { userId, tipo = "analisi_lampo" } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required" },
        { status: 400 }
      )
    }

    console.log("[init-form] Initializing form for userId:", userId, "tipo:", tipo)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: sections, error } = await supabase
      .from("form")
      .select("section_index, data")
      .eq("user_id", userId)
      .eq("tipo", tipo)
      .order("section_index", { ascending: true })

    if (error) throw error

    const savedData: Record<number, unknown> = {}
    let hasExistingData = false

    if (sections && sections.length > 0) {
      hasExistingData = true
      for (const row of sections) {
        savedData[row.section_index] = row.data
      }
    }

    const formStatusColumn = tipo === "diagnosi_strategica" ? "form_status_diagnosi" : "form_status_analisi"
    const { data: utente } = await supabase
      .from("utenti")
      .select(formStatusColumn)
      .eq("id", userId)
      .single()

    const currentStatus = utente?.[formStatusColumn]
    if (currentStatus && currentStatus !== "completed") {
      await supabase
        .from("utenti")
        .update({ [formStatusColumn]: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", userId)
    }

    console.log("[init-form] Form initialized for user:", userId, "hasExistingData:", hasExistingData)

    return NextResponse.json(
      {
        success: true,
        savedData,
        hasExistingData,
        message: hasExistingData ? "Form resumed from previous session" : "Form initialized",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[init-form] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Errore durante l'inizializzazione",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
