import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = typeof body === "string" ? JSON.parse(body) : body
    const { status, userId } = parsed
    const tipo = parsed.tipo || (parsed.product === "diagnosi-strategica" ? "diagnosi_strategica" : "analisi_lampo")

    if (!userId) {
      return NextResponse.json({ success: false, message: "userId required" }, { status: 400 })
    }

    console.log("[update-form-status] Updating form status to:", status, "for user:", userId)

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const formStatusColumn = tipo === "diagnosi_strategica" ? "form_status_diagnosi" : "form_status_analisi"

    const { error: updateError } = await supabase
      .from("utenti")
      .update({ [formStatusColumn]: status, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .neq(formStatusColumn, "completed")

    if (updateError) {
      console.error("[v0] Error updating form status:", updateError)
    } else {
      console.log("[v0] Form status updated to:", status)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Form status updated",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Error updating form status:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error updating form status",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
