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
        // Il redirect lo decide il server: chiede a /api/auth/role che
        // legge is_admin con admin client (service_role). Cosi' non
        // dipendiamo da policy RLS lato browser ne' da race condition
        // con la propagazione del cookie di sessione appena impostato.
        try {
          const res = await fetch('/api/auth/role', { cache: 'no-store' })
          const payload = await res.json()
          router.push(payload?.redirect || '/prodotti')
        } catch {
          router.push('/prodotti')
        }
      }
    } catch (err: any) {
      // Personalizza il messaggio di errore per credenziali errate
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
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <Image
            src="/logo-metodo-cantiere.png"
            alt="Metodo Cantiere"
            width={280}
            height={80}
            priority
            className="w-auto h-auto"
          />
          <p className="text-2xl font-bold text-primary mt-2">Portale Strategico</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Accedi al portale</h1>
          <p className="text-neutral-600 mb-6 text-sm leading-relaxed">
            Da qui entri in area riservata. Se hai gi&agrave; acquistato un prodotto,
            trovi i form da compilare e i tuoi report. Se sei un nuovo cliente,{' '}
            <Link href="/auth/sign-up" className="text-primary font-medium hover:underline">
              registrati qui
            </Link>
            .
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
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{loading ? 'Accesso in corso...' : 'Accedi'}</span>
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-600 mt-6">
            Non hai un account?{' '}
            <Link href="/auth/sign-up" className="text-primary font-medium hover:underline">
              Registrati
            </Link>
          </p>

          <div className="mt-4 pt-6 border-t border-neutral-200">
            <Link
              href="/auth/forgot-password"
              className="text-center block text-sm text-neutral-600 hover:text-primary font-medium transition-colors"
            >
              Hai dimenticato la password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
