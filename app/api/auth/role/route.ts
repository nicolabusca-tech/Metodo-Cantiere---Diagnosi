import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Dopo signInWithPassword nel browser, il client chiama questo endpoint
 * per sapere dove andare. Il check is_admin gira lato server con admin
 * client (service_role): zero rischi di race condition con i cookie di
 * sessione, zero dipendenza da policy RLS sul client.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ authenticated: false, redirect: '/auth/login' })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('utenti')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  const redirect = profile?.is_admin ? '/setup' : '/prodotti'
  return NextResponse.json({
    authenticated: true,
    isAdmin: !!profile?.is_admin,
    redirect,
  })
}
