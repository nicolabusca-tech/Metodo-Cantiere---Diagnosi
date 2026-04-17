import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { getUtentiAnalisiLampo, getFormStatus, hasDiagnosiEnabled } from '@/app/actions/database'
import { hasProductAccess } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scegli il tuo prodotto - Metodo Cantiere',
  description: 'Seleziona tra Analisi Lampo e Diagnosi Strategica',
}

type ProductState = 'not_paid' | 'fill_form' | 'waiting' | 'view_diagnosi'

function getProductState(isPaid: boolean, formCompleted: boolean, diagnosiReady: boolean): ProductState {
  if (!isPaid) return 'not_paid'
  if (!formCompleted) return 'fill_form'
  if (diagnosiReady) return 'view_diagnosi'
  return 'waiting'
}

export default async function ProdottiPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userId = user.id
  const customerEmail = user.email || ''
  let utentiData = null
  let formStatusAnalisi: string | null = null
  let formStatusDiagnosi: string | null = null
  let diagnosiEnabledAnalisi = false
  let diagnosiEnabledDiagnosi = false

  try {
    ;[utentiData, formStatusAnalisi, formStatusDiagnosi, diagnosiEnabledAnalisi, diagnosiEnabledDiagnosi] =
      await Promise.all([
        getUtentiAnalisiLampo(userId),
        getFormStatus(userId, 'analisi-lampo'),
        getFormStatus(userId, 'diagnosi-strategica'),
        hasDiagnosiEnabled(userId, 'analisi_lampo'),
        hasDiagnosiEnabled(userId, 'diagnosi_strategica'),
      ])
  } catch (err) {
    console.error('[v0] Prodotti page - Error fetching data:', err)
  }

  const isPaidAnalisi = hasProductAccess(utentiData?.paid_analisi, utentiData?.access_omaggio_analisi)
  const isPaidDiagnosi = hasProductAccess(utentiData?.paid_diagnosi, utentiData?.access_omaggio_diagnosi)

  const stateAnalisi = getProductState(isPaidAnalisi, formStatusAnalisi === 'completed', diagnosiEnabledAnalisi)
  const stateDiagnosi = getProductState(isPaidDiagnosi, formStatusDiagnosi === 'completed', diagnosiEnabledDiagnosi)

  const customerName = utentiData?.nome || user.user_metadata?.nome || ''
  const customerSurname = utentiData?.cognome || user.user_metadata?.cognome || ''
  const customerCompany = utentiData?.azienda || user.user_metadata?.azienda || ''

  const formLinkAnalisi = `/form?user_id=${encodeURIComponent(userId)}&userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(customerEmail)}&nome=${encodeURIComponent(customerName)}&cognome=${encodeURIComponent(customerSurname)}&azienda=${encodeURIComponent(customerCompany)}`
  const formLinkDiagnosi = `/form?product=diagnosi-strategica&user_id=${encodeURIComponent(userId)}&userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(customerEmail)}&nome=${encodeURIComponent(customerName)}&cognome=${encodeURIComponent(customerSurname)}&azienda=${encodeURIComponent(customerCompany)}`

  function getCardLink(state: ProductState, formLink: string, paymentLink: string, diagnosiLink: string) {
    switch (state) {
      case 'fill_form': return formLink
      case 'view_diagnosi': return diagnosiLink
      case 'waiting': return '#'
      default: return paymentLink
    }
  }

  const linkAnalisi = getCardLink(stateAnalisi, formLinkAnalisi, '/payment', '/diagnosi/analisi-lampo')
  const linkDiagnosi = getCardLink(stateDiagnosi, formLinkDiagnosi, '/payment-diagnosi-strategica', '/diagnosi/diagnosi-strategica')

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col items-center justify-center mb-12">
          <Image
            src="/logo-metodo-cantiere.png"
            alt="Metodo Cantiere"
            width={280}
            height={80}
            priority
            className="w-auto h-auto"
          />
          <h1 className="text-3xl font-bold text-neutral-900 mt-6 text-center">
            Scegli il tuo prodotto
          </h1>
          <p className="text-neutral-600 mt-2 text-center max-w-lg">
            Seleziona tra le nostre soluzioni per analizzare e far crescere la tua impresa digitale
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Analisi Lampo */}
          <ProductCard
            state={stateAnalisi}
            href={linkAnalisi}
            title="Analisi Lampo Metodo Cantiere®"
            subtitle="La radiografia veloce della tua impresa digitale"
            price="€147,00"
            features={[
              'Analisi completa della tua azienda',
              'Report dettagliato',
              'Quick wins per migliorare marketing e branding della tua azienda',
            ]}
            ctaLabels={{
              not_paid: 'Avanti: scegli Analisi Lampo',
              fill_form: 'Vai al form Analisi Lampo',
              waiting: 'Attendi che la diagnosi sia pronta',
              view_diagnosi: 'Visualizza la tua Analisi',
            }}
          />

          {/* Diagnosi Strategica */}
          <ProductCard
            state={stateDiagnosi}
            href={linkDiagnosi}
            title="Diagnosi Strategica Metodo Cantiere®"
            subtitle="Analisi approfondita e roadmap per la crescita digitale"
            price="€497,00"
            features={[
              'Diagnosi strategica e roadmap operativa per la crescita digitale',
              'Raccomandazioni Step-by-Step per rafforzare il posizionamento online',
            ]}
            ctaLabels={{
              not_paid: 'Avanti: scegli Diagnosi Strategica',
              fill_form: 'Vai al form Diagnosi Strategica',
              waiting: 'Attendi che la diagnosi sia pronta',
              view_diagnosi: 'Visualizza la tua Diagnosi',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function ProductCard({
  state,
  href,
  title,
  subtitle,
  price,
  features,
  ctaLabels,
}: {
  state: ProductState
  href: string
  title: string
  subtitle: string
  price: string
  features: string[]
  ctaLabels: Record<ProductState, string>
}) {
  const isClickable = state !== 'waiting'

  const badge = (() => {
    switch (state) {
      case 'fill_form':
        return (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3">
            <p className="text-green-800 text-sm font-medium">✓ Pagamento completato</p>
            <p className="text-green-700 text-xs mt-1">Completa il form per ricevere la tua diagnosi</p>
          </div>
        )
      case 'waiting':
        return (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-amber-800 text-sm font-medium">⏳ Attendi che la diagnosi sia pronta</p>
            <p className="text-amber-700 text-xs mt-1">Il pulsante sarà attivo quando la diagnosi sarà disponibile per la consultazione</p>
          </div>
        )
      case 'view_diagnosi':
        return (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-emerald-800 text-sm font-medium">✓ La tua diagnosi è pronta</p>
            <p className="text-emerald-700 text-xs mt-1">Clicca per visualizzarla</p>
          </div>
        )
      default:
        return null
    }
  })()

  const ctaClass =
    state === 'waiting'
      ? 'w-full bg-neutral-300 text-neutral-500 font-semibold py-3 px-4 rounded-lg cursor-not-allowed'
      : 'w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-colors'

  const card = (
    <div className={`bg-white rounded-xl shadow-lg border border-neutral-200 p-8 transition-all h-full flex flex-col ${isClickable ? 'hover:shadow-2xl cursor-pointer' : 'opacity-90'}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">{title}</h2>
        <p className="text-neutral-600 text-sm">{subtitle}</p>
      </div>

      {badge}

      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-4xl font-bold text-neutral-900">{price}</span>
          <span className="text-neutral-600 text-sm">una tantum</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-grow">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span className="text-primary font-bold text-lg flex-shrink-0">✓</span>
            <span className="text-neutral-700">{f}</span>
          </li>
        ))}
      </ul>

      <button className={ctaClass} disabled={state === 'waiting'}>
        {ctaLabels[state]}
      </button>
    </div>
  )

  if (!isClickable) {
    return card
  }

  return <Link href={href}>{card}</Link>
}
