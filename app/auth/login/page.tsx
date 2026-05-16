'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Il redirect lo decide il server: /api/auth/role legge is_admin
        // con admin client (service_role). Cosi' non dipendiamo da policy
        // RLS lato browser ne' da race condition con la propagazione del
        // cookie di sessione appena impostato.
        try {
          const res = await fetch('/api/auth/role', { cache: 'no-store' })
          const payload = await res.json()
          router.push(payload?.redirect || '/prodotti')
        } catch {
          router.push('/prodotti')
        }
      }
    } catch (err: any) {
      if (err.message === 'Invalid login credentials') {
        setError('Username e/password errati. Riprova.')
      } else {
        setError(err.message || 'Errore durante l\'accesso')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Top bar minimale con logo e link home, cosi' chi e' atterrato
          per caso dal sito principale sa di poter tornare indietro. */}
      <header className="border-b border-neutral-200/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Metodo Cantiere - Home portale">
            <Image
              src="/logo-metodo-cantiere.png"
              alt="Metodo Cantiere"
              width={180}
              height={50}
              priority
              className="h-auto w-[150px] sm:w-[180px]"
            />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 transition hover:text-primary"
          >
            &larr; Torna alla home
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* Pannello sinistro: contesto e orientamento */}
        <section className="order-2 lg:order-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Area clienti Metodo Cantiere
          </p>
          <h1 className="font-serif text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl">
            Qui dentro c&rsquo;&egrave; il lavoro che facciamo per te.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-neutral-700">
            Rispondi alle domande del form, noi mettiamo insieme i numeri, tu
            ricevi un documento da leggere e scaricare quando vuoi. Niente
            email da rincorrere, niente passaggi a vuoto: tutto succede da
            questa pagina.
          </p>

          <div className="mt-8 space-y-5">
            <Bullet
              n="A"
              title="Sei gi&agrave; cliente"
              body="Entri con la tua email qui a fianco e riprendi da dove eri rimasto: form, report, scarico PDF."
            />
            <Bullet
              n="B"
              title="&Egrave; la prima volta che entri"
              body="Crei l&rsquo;account in due minuti. Poi scegli: <strong>Analisi Lampo</strong> per partire subito (€147, ti arriva in 48 ore) o <strong>Diagnosi Strategica</strong> per andare a fondo (€497, ci mettiamo 10 giorni)."
              cta={{ href: '/auth/sign-up', label: 'Crea il tuo account' }}
            />
            <Bullet
              n="C"
              title="Password fuori uso"
              body="Sotto il form trovi il link per resettarla. Ti mandiamo una mail, la rifai in trenta secondi e sei dentro."
            />
          </div>

          <p className="mt-10 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-700">
            <span className="font-semibold text-neutral-900">Non hai ancora deciso quale prodotto?</span>{' '}
            Le pagine{' '}
            <a
              href="https://www.metodocantiere.com/audit/"
              className="font-medium text-primary hover:underline"
              rel="noopener noreferrer"
            >
              audit
            </a>{' '}
            e{' '}
            <a
              href="https://www.metodocantiere.com/diagnosi/"
              className="font-medium text-primary hover:underline"
              rel="noopener noreferrer"
            >
              diagnosi
            </a>{' '}
            sul sito{' '}
            <a
              href="https://www.metodocantiere.com"
              className="text-primary hover:underline"
              rel="noopener noreferrer"
            >
              metodocantiere.com
            </a>{' '}
            ti spiegano in concreto cosa cambia fra i due e qual &egrave; quello giusto per il tuo cantiere.
          </p>
        </section>

        {/* Pannello destro: form di login */}
        <section className="order-1 lg:order-2 lg:pt-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-neutral-900">Entra</h2>
            <p className="mt-1 mb-6 text-sm text-neutral-600">
              Email e password. Se ti perdi, sotto trovi i link di servizio.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-neutral-900">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-neutral-900">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 bg-primary font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && (
                  <svg
                    className="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                <span>{loading ? 'Accesso in corso...' : 'Accedi'}</span>
              </Button>
            </form>

            <div className="mt-6 space-y-3 border-t border-neutral-200 pt-6 text-center text-sm">
              <p className="text-neutral-600">
                Non hai un account?{' '}
                <Link href="/auth/sign-up" className="font-semibold text-primary hover:underline">
                  Registrati
                </Link>
              </p>
              <Link
                href="/auth/forgot-password"
                className="block font-medium text-neutral-600 transition-colors hover:text-primary"
              >
                Hai dimenticato la password?
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-neutral-500 sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} Metodo Cantiere</p>
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

function Bullet({
  n,
  title,
  body,
  cta,
}: {
  n: string
  title: string
  body: string
  cta?: { href: string; label: string }
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {n}
      </span>
      <div className="flex-1">
        <p
          className="text-sm font-semibold text-neutral-900"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <p
          className="mt-1 text-sm leading-relaxed text-neutral-600"
          dangerouslySetInnerHTML={{ __html: body }}
        />
        {cta && (
          <Link
            href={cta.href}
            className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
          >
            {cta.label} &rarr;
          </Link>
        )}
      </div>
    </div>
  )
}
