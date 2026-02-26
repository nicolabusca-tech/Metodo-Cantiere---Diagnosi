import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, nome, cognome, azienda } = body

    console.log('[v0] API: POST request received')
    console.log('[v0] API: Body:', { userId, email, nome, cognome, azienda })

    if (!userId || !email || !nome || !cognome) {
      console.error('[v0] API: Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, nome, cognome' },
        { status: 400 }
      )
    }

    // Usa SERVICE_ROLE_KEY per operazioni server-side
    console.log('[v0] API: Creating Supabase client with SERVICE_ROLE_KEY...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('[v0] API: Supabase URL:', supabaseUrl)
    console.log('[v0] API: Supabase URL configured:', !!supabaseUrl)
    console.log('[v0] API: Service Role Key available:', !!serviceRoleKey)

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[v0] API: Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    console.log('[v0] API: Creating Supabase client...')
    const supabase = createServerClient(supabaseUrl, serviceRoleKey)

    console.log('[v0] API: Creating utenti record...')
    const { data, error } = await supabase
      .from('utenti')
      .insert({
        id: userId,
        email,
        nome,
        cognome,
        azienda: azienda || null,
        paid_analisi: false,
        paid_diagnosi: false,
      })
      .select()

    if (error) {
      console.error('[v0] API Database Error:')
      console.error('[v0] - Code:', error.code)
      console.error('[v0] - Message:', error.message)
      console.error('[v0] - Details:', error.details)
      console.error('[v0] - Hint:', error.hint)
      console.error('[v0] - Full error:', JSON.stringify(error))
      
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        const { data: updateData, error: updateError } = await supabase
          .from('utenti')
          .update({ email, nome, cognome, azienda: azienda || null, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
        if (!updateError && updateData) {
          return NextResponse.json({ success: true, data: updateData[0] })
        }
      }
      
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Database table not found. Please contact support.',
            details: 'The utenti table may not exist in the database.',
            code: error.code
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Database error: ${error.message}`,
          details: error.details,
          code: error.code
        },
        { status: 500 }
      )
    }

    console.log('[v0] API: Record created successfully')
    console.log('[v0] API: Data returned:', data)
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[v0] API Exception occurred')
    console.error('[v0] - Message:', err.message)
    console.error('[v0] - Stack:', err.stack)
    console.error('[v0] - Full error:', JSON.stringify(err))
    return NextResponse.json(
      { error: `Server error: ${err.message}` },
      { status: 500 }
    )
  }
}
