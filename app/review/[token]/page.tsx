'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { DiagnosiViewer } from '@/components/diagnosi-viewer'
import { displayDiagnosiContent } from '@/lib/diagnosi-content'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { DiagnosiProgresso } from '@/lib/types'
import { DiagnosiProgressoIndicator } from '@/components/diagnosi-progresso-indicator'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { Pencil, Eye, Save, Loader2, CheckCircle, AlertCircle, FileDown } from 'lucide-react'

interface DiagnosiData {
  id: string
  user_id: string
  tipo: string
  diagnosi: string
  volume_1?: string
  volume_2?: string
  volume_3?: string
  enabled: boolean
  progresso: DiagnosiProgresso
  created_at: string
  updated_at: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type VolumeDrafts = [string, string, string]

const VOLUME_ROMAN = ['I', 'II', 'III'] as const

const TIPO_LABELS: Record<string, string> = {
  analisi_lampo: 'Analisi Lampo',
  diagnosi_strategica: 'Diagnosi Strategica',
}

function rowHasDisplayContent(d: DiagnosiData): boolean {
  if (d.tipo === 'diagnosi_strategica') {
    return (
      [d.volume_1, d.volume_2, d.volume_3].some((x) => (x ?? '').trim() !== '') ||
      (d.diagnosi ?? '').trim() !== ''
    )
  }
  return (d.diagnosi ?? '').trim() !== ''
}

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>()
  const reviewToken = Array.isArray(token) ? token[0] : token

  const [diagnosi, setDiagnosi] = useState<DiagnosiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftVolumes, setDraftVolumes] = useState<VolumeDrafts>(['', '', ''])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isExporting, setIsExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const fetchDiagnosi = useCallback(async () => {
    try {
      if (!reviewToken) {
        setError('Token mancante nell’URL.')
        return
      }

      const res = await fetch(`/api/review/${reviewToken}`)
      const rawText = await res.text()

      let json: { error?: string; diagnosi?: DiagnosiData } | null = null
      try {
        json = JSON.parse(rawText) as { error?: string; diagnosi?: DiagnosiData }
      } catch {
        setError(
          'Risposta del server non valida. Se il problema persiste, verifica su Vercel le variabili NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
        )
        return
      }

      if (!res.ok) {
        setError(json?.error || 'Errore nel caricamento')
        return
      }
      const row = json.diagnosi
      if (!row?.id) {
        setError('Risposta del server incompleta.')
        return
      }
      setDiagnosi({
        ...row,
        progresso: row.progresso === 'completato' ? 'completato' : 'in corso',
      })
      setDraft(row.diagnosi ?? '')
      setDraftVolumes([
        row.volume_1 ?? '',
        row.volume_2 ?? '',
        row.volume_3 ?? '',
      ])
    } catch {
      setError('Impossibile connettersi al server')
    } finally {
      setLoading(false)
    }
  }, [reviewToken])

  useEffect(() => {
    if (!reviewToken) {
      setLoading(false)
      setError('Token mancante nell’URL.')
      return
    }
    fetchDiagnosi()
  }, [reviewToken, fetchDiagnosi])

  const previewContent = useMemo(() => {
    if (!diagnosi) return ' '
    if (diagnosi.tipo === 'diagnosi_strategica') {
      return (
        displayDiagnosiContent({
          tipo: 'diagnosi_strategica',
          diagnosi: diagnosi.diagnosi,
          volume_1: draftVolumes[0],
          volume_2: draftVolumes[1],
          volume_3: draftVolumes[2],
        }) || ' '
      )
    }
    return displayDiagnosiContent({ tipo: 'analisi_lampo', diagnosi: draft }) || ' '
  }, [diagnosi, draft, draftVolumes])

  const savedDisplayContent = useMemo(() => {
    if (!diagnosi) return ''
    return displayDiagnosiContent({
      tipo: diagnosi.tipo as 'analisi_lampo' | 'diagnosi_strategica',
      diagnosi: diagnosi.diagnosi,
      volume_1: diagnosi.volume_1,
      volume_2: diagnosi.volume_2,
      volume_3: diagnosi.volume_3,
    })
  }, [diagnosi])

  const handleSave = async () => {
    if (!diagnosi) return
    setSaveStatus('saving')
    try {
      const body =
        diagnosi.tipo === 'diagnosi_strategica'
          ? {
              volume_1: draftVolumes[0],
              volume_2: draftVolumes[1],
              volume_3: draftVolumes[2],
            }
          : { diagnosi: draft }

      const res = await fetch(`/api/review/${reviewToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setSaveStatus('error')
        return
      }
      const row = json.diagnosi
      setDiagnosi({
        ...row,
        progresso: row.progresso === 'completato' ? 'completato' : 'in corso',
      })
      setDraft(row.diagnosi ?? '')
      setDraftVolumes([
        row.volume_1 ?? '',
        row.volume_2 ?? '',
        row.volume_3 ?? '',
      ])
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!diagnosi) return
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/review/${reviewToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSaveStatus('error')
        return
      }
      const row = json.diagnosi
      setDiagnosi({
        ...row,
        progresso: row.progresso === 'completato' ? 'completato' : 'in corso',
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  const handleDownloadPdf = async () => {
    if (!contentRef.current || !diagnosi) return
    setIsExporting(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const filename = `diagnosi-${diagnosi.tipo}-${new Date().toISOString().slice(0, 10)}.pdf`
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(contentRef.current)
        .save()
    } catch (err) {
      console.error('Errore durante l\'esportazione PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const resetDraftsFromSaved = (d: DiagnosiData) => {
    setDraft(d.diagnosi ?? '')
    setDraftVolumes([d.volume_1 ?? '', d.volume_2 ?? '', d.volume_3 ?? ''])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (error || !diagnosi) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-8 text-center max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Link non valido</h1>
          <p className="text-neutral-600">
            {error || 'La diagnosi richiesta non esiste o il link non è corretto.'}
          </p>
        </div>
      </div>
    )
  }

  const tipoLabel = TIPO_LABELS[diagnosi.tipo] || diagnosi.tipo
  const isStrategica = diagnosi.tipo === 'diagnosi_strategica'

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">
            Review: {tipoLabel} Metodo Cantiere®
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Utente: {diagnosi.user_id} &middot; Creata il{' '}
            {new Date(diagnosi.created_at).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Controls bar */}
        <div className="bg-white rounded-xl shadow border border-neutral-200 p-4 mb-6 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant={editing ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (editing) {
                  resetDraftsFromSaved(diagnosi)
                }
                setEditing(!editing)
              }}
            >
              {editing ? (
                <>
                  <Eye className="w-4 h-4 mr-1.5" />
                  Anteprima
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-1.5" />
                  Modifica
                </>
              )}
            </Button>

            {editing && (
              <Button size="sm" onClick={handleSave} disabled={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5" />
                )}
                Salva modifiche
              </Button>
            )}

            {!editing && rowHasDisplayContent(diagnosi) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isExporting}
              >
                <FileDown className="w-4 h-4 mr-1.5" />
                {isExporting ? 'Generazione...' : 'Scarica PDF'}
              </Button>
            )}

            {saveStatus === 'saved' && (
              <span className="flex items-center text-sm text-green-600 font-medium">
                <CheckCircle className="w-4 h-4 mr-1" />
                Salvato
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center text-sm text-red-600 font-medium">
                <AlertCircle className="w-4 h-4 mr-1" />
                Errore nel salvataggio
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-2">
              <span className="text-sm text-neutral-600 font-medium whitespace-nowrap">
                Progresso
              </span>
              <DiagnosiProgressoIndicator progresso={diagnosi.progresso} />
            </div>
            {diagnosi.enabled ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
                Visibile all'utente
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
                Non visibile all'utente
              </span>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={diagnosi.enabled}
                onCheckedChange={handleToggleEnabled}
              />
              <span className="text-sm text-neutral-700 font-medium">
                Abilita
              </span>
            </label>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-8 md:p-12 relative">
          {editing ? (
            <ResizablePanelGroup direction="horizontal" className="min-h-[600px]">
              <ResizablePanel defaultSize={50} minSize={30}>
                {isStrategica ? (
                  <div className="flex flex-col gap-6 min-h-[600px] h-full overflow-auto pr-2">
                    {([0, 1, 2] as const).map((i) => (
                      <div key={i} className="flex flex-col gap-2 flex-1 min-h-0">
                        <label className="text-sm font-medium text-neutral-700">
                          Volume {VOLUME_ROMAN[i]}
                        </label>
                        <Textarea
                          value={draftVolumes[i]}
                          onChange={(e) => {
                            const v = e.target.value
                            setDraftVolumes((prev) => {
                              const next: VolumeDrafts = [...prev]
                              next[i] = v
                              return next
                            })
                          }}
                          className="min-h-[220px] flex-1 font-mono text-sm leading-relaxed"
                          placeholder={`HTML o Markdown — Volume ${VOLUME_ROMAN[i]}...`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-[600px] h-full w-full resize-none font-mono text-sm leading-relaxed rounded-r-none border-r-0"
                    placeholder="Markdown a sinistra..."
                  />
                )}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="min-h-[600px] h-full overflow-auto border border-input rounded-r-lg bg-background p-6">
                  <div className="mb-6 pb-4 border-b border-neutral-200">
                    <p className="text-sm text-neutral-500 font-medium">Anteprima (documento unico)</p>
                  </div>
                  <DiagnosiViewer content={previewContent} />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <>
              {rowHasDisplayContent(diagnosi) ? (
                <div ref={contentRef} className="pdf-content">
                  <div className="mb-8 pb-6 border-b border-neutral-200">
                    <h1 className="text-3xl font-bold text-neutral-900">
                      {tipoLabel} Metodo Cantiere®
                    </h1>
                    <p className="text-sm text-neutral-500 mt-2">
                      Generata il{' '}
                      {new Date(diagnosi.created_at).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <DiagnosiViewer content={savedDisplayContent || ' '} />
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-400">
                  <p className="text-lg font-medium">Nessun contenuto</p>
                  <p className="text-sm mt-1">
                    Clicca su &quot;Modifica&quot; per inserire il contenuto della diagnosi.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
