import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUtentiDiagnosiStrategica } from '@/app/actions/database'
import { hasProductAccess } from '@/lib/utils'

export default async function FormDiagnosiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const utentiData = await getUtentiDiagnosiStrategica(user.id)
  const isPaidDiagnosi = hasProductAccess(utentiData?.paid_diagnosi, utentiData?.access_omaggio_diagnosi)

  if (!isPaidDiagnosi) {
    redirect('/payment-diagnosi-strategica')
  }

  const customerEmail = user.email || ''
  const customerName = utentiData?.nome || user.user_metadata?.nome || ''
  const customerSurname = utentiData?.cognome || user.user_metadata?.cognome || ''
  const customerCompany = utentiData?.azienda || user.user_metadata?.azienda || ''
  const formUrl = `/form?product=diagnosi-strategica&user_id=${encodeURIComponent(user.id)}&userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(customerEmail)}&nome=${encodeURIComponent(customerName)}&cognome=${encodeURIComponent(customerSurname)}&azienda=${encodeURIComponent(customerCompany)}`
  redirect(formUrl)
}
