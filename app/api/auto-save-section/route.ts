import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { titolo, data, userId, tipo, sectionIndex } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required" },
        { status: 400 }
      )
    }

    if (sectionIndex == null || !tipo) {
      return NextResponse.json(
        { success: false, message: "sectionIndex and tipo are required" },
        { status: 400 }
      )
    }

    console.log(`[auto-save] Saving section index ${sectionIndex} ("${titolo}") for userId: ${userId}, tipo: ${tipo}`)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const formStatusColumn = tipo === "diagnosi_strategica" ? "form_status_diagnosi" : "form_status_analisi"
    const { data: utente } = await supabase
      .from("utenti")
      .select(formStatusColumn)
      .eq("id", userId)
      .single()

    if (utente?.[formStatusColumn] === "completed") {
      return NextResponse.json(
        { success: false, message: "Cannot modify a completed form" },
        { status: 400 }
      )
    }

    await supabase
      .from("utenti")
      .update({ [formStatusColumn]: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", userId)

    const { error: upsertError } = await supabase
      .from("form")
      .upsert(
        {
          user_id: userId,
          section_index: sectionIndex,
          titolo,
          data,
          tipo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,section_index,tipo" }
      )

    if (upsertError) throw upsertError

    console.log(`[auto-save] Section "${titolo}" saved successfully`)

    return NextResponse.json(
      {
        success: true,
        message: `Sezione "${titolo}" salvata`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[auto-save] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Errore durante il salvataggio"
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
