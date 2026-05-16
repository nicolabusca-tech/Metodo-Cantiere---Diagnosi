import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ReactNode } from 'react'

/**
 * Gate del pannello /setup: niente piu' password fissa, controlla la
 * sessione Supabase e il flag utenti.is_admin. Se non sei loggato vai al
 * login; se sei loggato ma non admin vieni mandato alla pagina prodotti.
 */
export default async function SetupLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/setup')
  }

  const { data: profile } = await supabase
    .from('utenti')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    redirect('/prodotti')
  }

  return <>{children}</>
}
