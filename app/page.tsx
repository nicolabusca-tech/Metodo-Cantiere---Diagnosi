import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Metodo Cantiere - Analisi Lampo e Diagnosi Strategica',
  description:
    "Due strumenti per fotografare e far crescere l'impresa edile digitale: l'Analisi Lampo in 48 ore e la Diagnosi Strategica in 10 giorni.",
}

/**
 * Landing pubblica della parte cliente. Chi atterra qui dal sito principale
 * (sezioni /audit e /diagnosi di metodocantiere.com) deve capire in due
 * sguardi che il portale serve a registrarsi e scegliere il prodotto.
 * Se la sessione e' gia' attiva non perdiamo tempo: redirect operativo.
 */
export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('utenti')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_admin) {
      redirect('/setup')
    }
    redirect('/prodotti')
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* Top bar */}
      <header className="border-b border-neutral-200/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Image
            src="/logo-metodo-cantiere.png"
            alt="Metodo Cantiere"
            width={220}
            height={62}
            priority
            className="h-auto w-[180px] sm:w-[220px]"
          />
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden text-sm font-medium text-neutral-700 transition hover:text-primary sm:inline"
            >
              Hai gi&agrave; un account? Accedi
            </Link>
            <Link
              href="/auth/login"
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 transition hover:border-primary hover:text-primary sm:hidden"
            >
              Accedi
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-neutral-200/70 bg-gradient-to-b from-neutral-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Area clienti Metodo Cantiere
              </p>
              <h1 className="font-serif text-4xl font-bold leading-[1.1] text-neutral-900 sm:text-5xl md:text-6xl">
                I numeri della tua impresa, scritti chiari.
                <br />
                <span className="text-primary">E le mosse da fare per crescere.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-700">
                Niente teoria, niente fuffa da consulenti. Tu rispondi alle nostre domande
                sulla tua impresa, noi ti restituiamo un documento che ti dice come stai e
                cosa muovere subito. Veloce o approfondito, lo scegli tu.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary/90"
                >
                  Crea il tuo account
                </Link>
                <Link
                  href="#prodotti"
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-6 py-3 text-base font-semibold text-neutral-800 transition hover:border-primary hover:text-primary"
                >
                  Vedi i due prodotti
                </Link>
              </div>

              <p className="mt-5 text-sm text-neutral-500">
                Registrarti non costa niente. Paghi solo il prodotto che scegli, una volta sola.
              </p>
            </div>

            {/* Pannello laterale: come funziona in 3 passi */}
            <aside className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Come funziona, in tre mosse
              </p>
              <ol className="space-y-5">
                <Step
                  n={1}
                  title="Apri l&rsquo;account"
                  body="Email, password, due dati sulla tua impresa. Ci metti due minuti."
                />
                <Step
                  n={2}
                  title="Scegli il prodotto"
                  body="Analisi Lampo se vuoi una fotografia veloce (48 ore). Diagnosi Strategica se vuoi un piano serio su cui lavorare (10 giorni)."
                />
                <Step
                  n={3}
                  title="Compili il form, ricevi il documento"
                  body="Domande mirate, niente compitini. Poi il report te lo trovi qui dentro, da leggere a schermo o da scaricare in PDF."
                />
              </ol>
            </aside>
          </div>
        </div>
      </section>

      {/* Prodotti */}
      <section id="prodotti" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              I due prodotti
            </p>
            <h2 className="font-serif text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl">
              Stesso metodo. Due livelli di dettaglio. Scegli in base a quanto vuoi vederci.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-700">
              Tutti e due partono dalle stesse domande &mdash; chi sei, dove ti muovi,
              contro chi giochi sul tuo territorio. Cambia solo quanto a fondo scaviamo nelle
              risposte. Una panoramica per partire, oppure una mappa completa per costruire il
              prossimo anno.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <ProductCard
              tag="Veloce"
              tagTone="neutral"
              title="Analisi Lampo"
              subtitle="Una fotografia rapida della tua impresa, per capire da dove partire."
              price="&euro;147"
              priceNote="una tantum"
              timeLabel="48 ore"
              timeNote="da quando finisci il form"
              features={[
                'Voto sintetico su brand, marketing e presenza online',
                'Tre mosse pronte da mettere in cantiere subito',
                'Confronto al volo con un tuo concorrente diretto',
                'PDF da scaricare, scritto come parlerebbe un collega, non un consulente',
              ]}
              ctaLabel="Inizia con l'Analisi Lampo"
              ctaHref="/auth/sign-up"
              footnote="Va bene se vuoi un primo colpo d&rsquo;occhio prima di impegnarti su un percorso lungo."
            />

            <ProductCard
              tag="Approfondita"
              tagTone="primary"
              title="Diagnosi Strategica"
              subtitle="Il piano di crescita cucito addosso alla tua impresa."
              price="&euro;497"
              priceNote="una tantum"
              timeLabel="10 giorni"
              timeNote="con ricerca dedicata sui tuoi concorrenti locali"
              features={[
                'Tre volumi: dove sei oggi, contro chi giochi, cosa fare nei prossimi mesi',
                'Studio del tuo posizionamento sul mercato locale, zona per zona',
                'Roadmap operativa step-by-step da seguire nei mesi successivi',
                'Documento editoriale (decine di pagine) impaginato come una rivista',
              ]}
              ctaLabel="Scegli la Diagnosi Strategica"
              ctaHref="/auth/sign-up"
              footnote="Va bene se vuoi un piano serio su cui costruire il prossimo anno di lavoro."
            />
          </div>

          {/* Reassurance line */}
          <div className="mt-12 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-700 sm:p-8">
            <p className="leading-relaxed">
              <span className="font-semibold text-neutral-900">Come lavoriamo.</span>{' '}
              Niente report fotocopia: ogni documento parte dai dati che ci dai tu, incrociati
              con il nostro metodo. Per questo qualche giorno serve, e per questo lo rileggi
              ancora con utilit&agrave; sei mesi dopo.
            </p>
          </div>

          {/* Already registered prompt */}
          <p className="mt-10 text-center text-sm text-neutral-600">
            Hai gi&agrave; un account?{' '}
            <Link href="/auth/login" className="font-semibold text-primary hover:underline">
              Accedi al portale
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-neutral-500 sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} Metodo Cantiere &middot; Tutti i diritti riservati</p>
          <a
            href="https://www.metodocantiere.com"
            className="hover:text-primary"
            rel="noopener noreferrer"
          >
            metodocantiere.com
          </a>
        </div>
      </footer>
    </main>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {n}
      </span>
      <div>
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600">{body}</p>
      </div>
    </li>
  )
}

function ProductCard({
  tag,
  tagTone,
  title,
  subtitle,
  price,
  priceNote,
  timeLabel,
  timeNote,
  features,
  ctaLabel,
  ctaHref,
  footnote,
}: {
  tag: string
  tagTone: 'neutral' | 'primary'
  title: string
  subtitle: string
  price: string
  priceNote: string
  timeLabel: string
  timeNote: string
  features: string[]
  ctaLabel: string
  ctaHref: string
  footnote: string
}) {
  const tagClass =
    tagTone === 'primary'
      ? 'bg-primary text-white'
      : 'bg-neutral-100 text-neutral-700 border border-neutral-200'

  return (
    <article className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition hover:shadow-lg">
      <div className="mb-5 flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${tagClass}`}
        >
          {tag}
        </span>
        <span className="text-xs font-medium text-neutral-500">
          Consegna in {timeLabel}
        </span>
      </div>

      <h3 className="font-serif text-2xl font-bold text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>

      <div className="mt-6 flex items-baseline gap-2 border-y border-neutral-100 py-5">
        <span
          className="text-4xl font-bold text-neutral-900"
          dangerouslySetInnerHTML={{ __html: price }}
        />
        <span className="text-sm text-neutral-500">{priceNote}</span>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Cosa ricevi
      </p>
      <ul className="mt-3 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span className="mt-1 flex-shrink-0 text-primary" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 10.5L8.5 14L15 6.5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              className="text-sm leading-relaxed text-neutral-700"
              dangerouslySetInnerHTML={{ __html: f }}
            />
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs italic leading-relaxed text-neutral-500">{footnote}</p>

      <Link
        href={ctaHref}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
      >
        {ctaLabel}
      </Link>
      <p className="mt-2 text-center text-xs text-neutral-500">
        Tempo medio di consegna: {timeNote}
      </p>
    </article>
  )
}
