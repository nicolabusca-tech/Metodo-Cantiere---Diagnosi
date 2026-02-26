import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StripeCheckout } from '@/components/stripe-checkout'
import { getUtentiDiagnosiStrategica, createUtentiDiagnosiStrategica, getFormStatus } from '@/app/actions/database'
import { isPaidValue } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pagamento - Diagnosi Strategica',
  robots: 'noindex, nofollow',
  other: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
}

export default async function PaymentDiagnosiStrategicaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userId = user.id
  const customerEmail = user.email || ''

  // Recupera i dati da utenti
  let utentiData = null
  try {
    utentiData = await getUtentiDiagnosiStrategica(userId)
    
    // Se non esiste il record, crealo
    if (!utentiData) {
      const customerName = user.user_metadata?.nome || ''
      const customerSurname = user.user_metadata?.cognome || ''
      
      utentiData = await createUtentiDiagnosiStrategica(
        userId,
        customerEmail,
        customerName,
        customerSurname
      )
    }
  } catch (err: any) {
    console.error('[v0] Payment diagnosi page - Error fetching utentiData:', err)
  }

  // Controlla lo stato del pagamento per Diagnosi Strategica
  const isPaidDiagnosi = isPaidValue(utentiData?.paid_diagnosi)
  
  console.log('[v0] Payment diagnosi page - isPaidDiagnosi:', isPaidDiagnosi)

  // Se non ha pagato, mostra il box di pagamento
  if (!isPaidDiagnosi) {
    return (
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <Button asChild variant="outline" className="border-neutral-300">
              <Link href="/prodotti">Indietro: torna ai prodotti</Link>
            </Button>
          </div>

          <div className="flex flex-col items-center justify-center mb-8">
            <Image
              src="/logo-metodo-cantiere.png"
              alt="Metodo Cantiere"
              width={280}
              height={80}
              priority
              className="h-16 w-auto"
            />
            <p className="text-2xl font-bold text-primary mt-2">Diagnosi Strategica</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2 text-balance">
              Diagnosi Strategica
            </h1>
            <p className="text-neutral-600 mb-4">
              Analisi approfondita e roadmap operativa per la crescita digitale
            </p>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-bold text-neutral-900">€497,00</span>
              <span className="text-neutral-600">una tantum</span>
            </div>
            <ul className="space-y-2 text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Diagnosi strategica e roadmap operativa per la crescita digitale</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">✓</span>
                <span>Raccomandazioni Step-by-Step per rafforzare il posizionamento online</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
              Completa il pagamento
            </h2>
            <StripeCheckout
              productId="diagnosi-strategica"
              userId={userId}
              customerEmail={customerEmail}
              buttonLabel="Avanti: procedi al pagamento - €497,00"
            />
          </div>
        </div>
      </div>
    )
  }

  // Se ha pagato, controlla il form_status dalla tabella submissions
  const formStatus = await getFormStatus(userId, 'diagnosi-strategica')
  
  console.log('[v0] Payment diagnosi page - formStatus:', formStatus)

  if (formStatus === 'completed') {
    // L'utente ha pagato e completato il form
    return (
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center mb-8">
            <Image
              src="/logo-metodo-cantiere.png"
              alt="Metodo Cantiere"
              width={280}
              height={80}
              priority
              className="h-16 w-auto"
            />
            <p className="text-2xl font-bold text-primary mt-2">Diagnosi Strategica</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
              La tua Diagnosi Strategica di Metodo Cantiere® sarà pronta tra circa 10 giorni!
            </h2>
            <Button asChild variant="outline" className="border-neutral-300">
              <Link href="/prodotti">Indietro: torna ai prodotti</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Se ha pagato ma il form non è completato
  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Button asChild variant="outline" className="border-neutral-300">
            <Link href="/prodotti">Indietro: torna ai prodotti</Link>
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center mb-8">
            <Image
              src="/logo-metodo-cantiere.png"
              alt="Metodo Cantiere"
              width={280}
              height={80}
              priority
              className="w-auto h-auto"
            />
            <p className="text-2xl font-bold text-primary mt-2">Diagnosi Strategica</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2 text-balance">
            Diagnosi Strategica
          </h1>
          <p className="text-neutral-600 mb-4">
            Analisi approfondita e roadmap operativa per la crescita digitale
          </p>
        </div>

        {(formStatus === 'incomplete' || formStatus === null || formStatus === undefined) ? (
          // L'utente ha pagato ma non ha iniziato il form (o form_status è null dopo il pagamento)
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
              Completa il form per ricevere la tua Diagnosi Strategica di Metodo Cantiere®
            </h2>
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 h-12"
            >
              <Link
                href="/form-diagnosi"
              >
                Avanti: apri il percorso Diagnosi Strategica
              </Link>
            </Button>
          </div>
        ) : (
          // L'utente ha pagato e il form è in corso
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8 text-center">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
              Porta a termine il form per ricevere la tua Diagnosi Strategica di Metodo Cantiere®
            </h2>
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8 h-12"
            >
              <Link
                href="/form-diagnosi?resume=true"
              >
                Avanti: riprendi il percorso Diagnosi Strategica
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
