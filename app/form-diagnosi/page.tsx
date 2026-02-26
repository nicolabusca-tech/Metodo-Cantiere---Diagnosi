import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUtentiDiagnosiStrategica } from '@/app/actions/database'
import { isPaidValue } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default async function FormDiagnosiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const utentiData = await getUtentiDiagnosiStrategica(user.id)
  const isPaidDiagnosi = isPaidValue(utentiData?.paid_diagnosi)

  if (!isPaidDiagnosi) {
    redirect('/payment-diagnosi-strategica')
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg border border-neutral-200 p-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-3">Form Diagnosi Strategica</h1>
        <p className="text-neutral-600 mb-8">
          Questa sezione e in preparazione. Nel prossimo rilascio troverai il form dedicato alla Diagnosi Strategica.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className="border-neutral-300">
            <Link href="/payment-diagnosi-strategica">Indietro: torna al riepilogo Diagnosi</Link>
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 text-white">
            <Link href="/prodotti">Avanti: vai alla scelta prodotti</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
