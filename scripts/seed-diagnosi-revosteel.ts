import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { REVOSTEEL_DIAGNOSI_HTML } from '../lib/diagnosi-seed-revosteel'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const USER_ID = '46282f39-44d3-472d-a53d-6db503821d4f'
const TIPO = 'diagnosi_strategica'

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: existing } = await supabase
    .from('diagnosi')
    .select('id')
    .eq('user_id', USER_ID)
    .eq('tipo', TIPO)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('diagnosi')
      .update({
        volume_1: REVOSTEEL_DIAGNOSI_HTML,
        diagnosi: '',
        enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Update failed:', error)
      process.exit(1)
    }
    console.log(`Updated diagnosi ${existing.id} for user ${USER_ID}`)
  } else {
    const { data, error } = await supabase
      .from('diagnosi')
      .insert({
        user_id: USER_ID,
        tipo: TIPO,
        volume_1: REVOSTEEL_DIAGNOSI_HTML,
        diagnosi: '',
        enabled: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Insert failed:', error)
      process.exit(1)
    }
    console.log(`Inserted diagnosi ${data.id} for user ${USER_ID}`)
  }

  console.log('Done.')
}

main()
