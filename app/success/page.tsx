'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Clock, FileText, Mail } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { markPaymentComplete } from '@/app/actions/stripe'

type ProductId = 'analisi-lampo' | 'diagnosi-strategica'

function buildFormUrl(
  productId: string,
  userId: string,
  email: string,
  nome: string,
  cognome: string,
  azienda: string,
): string {
  const params = new URLSearchParams({
    user_id: userId,
    userId,
    email: email || '',
    nome: nome || '',
    cognome: cognome || '',
    azienda: azienda || '',
  })
  if (productId === 'diagnosi-strategica') {
    params.set('product', 'diagnosi-strategica')
  }
  return `/form?${params.toString()}`
}

const PRODUCT_COPY: Record<
  ProductId,
  {
    title: string
    timing: string
    timingDetail: string
  }
> = {
  'analisi-lampo': {
    title: 'Analisi Lampo Metodo Cantiere',
    timing: 'Risposta entro 48 ore',
    timingDetail:
      'Appena ricevuto il form generiamo il tuo report. Te lo trovi in area riservata, da leggere a video o da scaricare in PDF.',
  },
  'diagnosi-strategica': {
    title: 'Diagnosi Strategica Metodo Cantiere',
    timing: 'Documento pronto in 10 giorni',
    timingDetail:
      "La Diagnosi richiede ricerca dedicata sui tuoi competitor e sul mercato locale. Per questo ci prendiamo i giorni che servono: il documento finale e' lungo, scritto su misura e impaginato come un libro.",
  },
}

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const processedRef = useRef(false)

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [formUrl, setFormUrl] = useState<string | null>(null)
  const [productId, setProductId] = useState<ProductId | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId) {
      setStatus('error')
      setErrorMessage(
        'Sessione di pagamento non trovata. Se hai già pagato, scrivici e ti risolviamo manualmente.',
      )
      return
    }
    if (processedRef.current) return
    processedRef.current = true

    markPaymentComplete(sessionId).then((result) => {
      if (!result.success) {
        setStatus('error')
        setErrorMessage(result.error || 'Errore durante la verifica del pagamento.')
        return
      }
      if (!result.userId || !result.productId) {
        setStatus('error')
        setErrorMessage('Mancano alcuni dati. Vai alla pagina prodotti, da li riprendi.')
        return
      }

      const url = buildFormUrl(
        result.productId,
        result.userId,
        result.customerEmail ?? '',
        result.nome ?? '',
        result.cognome ?? '',
        result.azienda ?? '',
      )
      setFormUrl(url)
      setProductId(result.productId as ProductId)
      setStatus('success')
    })
  }, [searchParams])

  if (status === 'loading') {
    return (
      <CenteredCard>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <h1 className="text-xl font-semibold text-neutral-900">
            Stiamo confermando il tuo pagamento...
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Ci servono pochi secondi.
          </p>
        </div>
      </CenteredCard>
    )
  }

  if (status === 'error') {
    return (
      <CenteredCard>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 rounded-full bg-amber-100 p-4">
            <AlertCircle className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Qualcosa non &egrave; andato a buon fine
          </h1>
          <p className="mt-3 text-neutral-600">{errorMessage}</p>
          <div className="mt-8 w-full space-y-2">
            <Link href="/prodotti" className="block">
              <Button className="w-full bg-primary py-3 font-semibold text-white hover:bg-primary/90">
                Vai alla pagina prodotti
              </Button>
            </Link>
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                Torna alla home
              </Button>
            </Link>
          </div>
        </div>
      </CenteredCard>
    )
  }

  const copy = productId ? PRODUCT_COPY[productId] : null

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-white">
      <header className="border-b border-neutral-200/70">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-5 sm:px-6">
          <Image
            src="/logo-metodo-cantiere.png"
            alt="Metodo Cantiere"
            width={200}
            height={56}
            priority
            className="h-auto w-[180px]"
          />
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-12">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Pagamento confermato
              </p>
              <h1 className="mt-1 font-serif text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl">
                Grazie, &egrave; tutto a posto.
              </h1>
            </div>
          </div>

          {copy && (
            <p className="text-base leading-relaxed text-neutral-700">
              Hai sbloccato la <span className="font-semibold">{copy.title}</span>. Adesso ti
              serve solo un passaggio: compilare il form. Sono le domande con cui costruiamo il
              tuo report personalizzato &mdash; rispondi con calma, prendi i 10/15 minuti che
              meritano.
            </p>
          )}

          {/* Prossimi passi */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <NextStepCard
              icon={<FileText className="h-5 w-5" />}
              title="1. Compili il form"
              body="10/15 minuti di domande mirate sulla tua impresa."
            />
            <NextStepCard
              icon={<Clock className="h-5 w-5" />}
              title="2. Aspetti"
              body={copy?.timing || 'Tempistica in base al prodotto scelto'}
            />
            <NextStepCard
              icon={<Mail className="h-5 w-5" />}
              title="3. Ricevi il documento"
              body="Lo trovi in area riservata, con notifica via email."
            />
          </div>

          {copy && (
            <p className="mt-6 text-sm leading-relaxed text-neutral-600">
              {copy.timingDetail}
            </p>
          )}

          {/* CTA */}
          {formUrl && (
            <div className="mt-10 flex flex-col gap-3 border-t border-neutral-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  Vuoi farlo subito?
                </p>
                <p className="text-sm text-neutral-600">
                  Apri il form e iniziamo. Puoi anche salvare a met&agrave; e riprenderlo dopo.
                </p>
              </div>
              <Button
                onClick={() => router.push(formUrl)}
                className="w-full bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-primary/90 sm:w-auto"
              >
                Vai al form
              </Button>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-neutral-400">
            Hai dubbi? Scrivici da{' '}
            <a
              href="https://www.metodocantiere.com"
              className="font-medium text-neutral-600 hover:text-primary"
              rel="noopener noreferrer"
            >
              metodocantiere.com
            </a>
            , ti rispondiamo entro la giornata.
          </p>
        </div>
      </section>
    </main>
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-white p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-12">
        {children}
      </div>
    </div>
  )
}

function NextStepCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">{icon}</div>
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-600">{body}</p>
    </div>
  )
}
