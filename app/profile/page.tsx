'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HeaderWithProfile from '@/components/header-with-profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import Link from 'next/link'
import { isPaidValue } from '@/lib/utils'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [utentiData, setUtentiData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [azienda, setAzienda] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/auth/login')
        return
      }

      setUser(user)

      // Carica i dati dalla tabella utenti (fonte primaria)
      const { data, error } = await supabase
        .from('utenti')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setUtentiData(data)
        setNome(data.nome || '')
        setCognome(data.cognome || '')
        setAzienda(data.azienda || '')
      }

      setLoading(false)
    }

    loadUserData()
  }, [router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('utenti')
        .update({
          nome,
          cognome,
          azienda,
        })
        .eq('id', user.id)

      if (error) throw error

      setSaveSuccess('Profilo aggiornato con successo!')
      setEditing(false)
      setUtentiData({ ...utentiData, nome, cognome, azienda })
    } catch (err: any) {
      setSaveError(err.message || 'Errore nel salvataggio del profilo')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Le password non corrispondono')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('La password deve contenere almeno 6 caratteri')
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setPasswordSuccess('Password aggiornata con successo!')
      setChangingPassword(false)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(err.message || 'Errore nel cambio della password')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <HeaderWithProfile />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-neutral-600 mt-4">Caricamento profilo...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <HeaderWithProfile />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Sezione Informazioni Personali */}
          <div className="bg-white rounded-lg border border-neutral-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-neutral-900">Informazioni Personali</h2>
              <Button
                onClick={() => setEditing(!editing)}
                variant={editing ? 'destructive' : 'default'}
              >
                {editing ? 'Annulla' : 'Modifica'}
              </Button>
            </div>

            {saveSuccess && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                ✓ {saveSuccess}
              </div>
            )}

            {saveError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                {saveError}
              </div>
            )}

            {editing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Inserisci il tuo nome"
                  />
                </div>

                <div>
                  <Label htmlFor="cognome">Cognome</Label>
                  <Input
                    id="cognome"
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    placeholder="Inserisci il tuo cognome"
                  />
                </div>

                <div>
                  <Label htmlFor="azienda">Azienda</Label>
                  <Input
                    id="azienda"
                    value={azienda}
                    onChange={(e) => setAzienda(e.target.value)}
                    placeholder="Inserisci il nome dell'azienda"
                  />
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-600">Nome</p>
                    <p className="text-base font-medium text-neutral-900">{nome || 'Non impostato'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600">Cognome</p>
                    <p className="text-base font-medium text-neutral-900">{cognome || 'Non impostato'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Azienda</p>
                  <p className="text-base font-medium text-neutral-900">{azienda || 'Non impostata'}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Email</p>
                  <p className="text-base font-medium text-neutral-900">{user.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sezione Sicurezza */}
          <div className="bg-white rounded-lg border border-neutral-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-neutral-900">Sicurezza</h2>
              <Button
                onClick={() => setChangingPassword(!changingPassword)}
                variant={changingPassword ? 'destructive' : 'default'}
              >
                {changingPassword ? 'Annulla' : 'Cambia Password'}
              </Button>
            </div>

            {passwordSuccess && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                ✓ {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                {passwordError}
              </div>
            )}

            {changingPassword ? (
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="newPassword">Nuova Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Inserisci la nuova password"
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Conferma Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Conferma la nuova password"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Aggiorna Password
                </Button>
              </form>
            ) : (
              <p className="text-neutral-600">Clicca su "Cambia Password" per modificare la tua password</p>
            )}
          </div>

          {/* Sezione Servizi */}
          <div className="bg-white rounded-lg border border-neutral-200 p-8">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-6">Servizi Acquistati</h2>
            {isPaidValue(utentiData?.paid_analisi) || isPaidValue(utentiData?.paid_diagnosi) ? (
              <div className="space-y-3">
                {isPaidValue(utentiData?.paid_analisi) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">✓ Analisi Lampo - Pagamento completato</p>
                  </div>
                )}
                {isPaidValue(utentiData?.paid_diagnosi) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">✓ Diagnosi Strategica - Pagamento completato</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                <p className="text-neutral-600 font-medium">Nessun servizio acquistato</p>
                <Link href="/prodotti" className="text-primary hover:underline text-sm mt-2 inline-block">
                  Vai ai prodotti →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
