"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  Lock,
  GripVertical,
  Eye,
  Settings,
  Sparkles,
  FileText,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { FormSection, FormQuestion } from "@/lib/setup-seed"
import { DEFAULT_ANALISI_LAMPO_CONFIG, DEFAULT_DIAGNOSI_STRATEGICA_CONFIG } from "@/lib/setup-seed"

type AnalysisType = "analisi_lampo" | "diagnosi_strategica"

const QUESTION_TYPES: { value: FormQuestion["type"]; label: string }[] = [
  { value: "text", label: "Testo" },
  { value: "textarea", label: "Testo lungo" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Telefono" },
  { value: "url", label: "URL" },
  { value: "number", label: "Numero" },
  { value: "slider", label: "Slider" },
  { value: "radio", label: "Scelta multipla" },
  { value: "competitors", label: "Competitor (speciale)" },
]

function typeBadgeColor(type: FormQuestion["type"]): string {
  const map: Record<string, string> = {
    text: "bg-blue-100 text-blue-800",
    textarea: "bg-indigo-100 text-indigo-800",
    email: "bg-green-100 text-green-800",
    tel: "bg-yellow-100 text-yellow-800",
    url: "bg-cyan-100 text-cyan-800",
    number: "bg-orange-100 text-orange-800",
    slider: "bg-purple-100 text-purple-800",
    radio: "bg-pink-100 text-pink-800",
    competitors: "bg-red-100 text-red-800",
  }
  return map[type] || "bg-gray-100 text-gray-800"
}

// ────────────────────────────────────────────
// Password Gate
// ────────────────────────────────────────────
function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/setup/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        onAuth()
      } else {
        const data = await res.json()
        setError(data.error || "Accesso negato")
      }
    } catch {
      setError("Errore di connessione")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center">
            <Lock className="w-7 h-7 text-neutral-600" />
          </div>
          <CardTitle className="text-2xl">Setup Configurazione</CardTitle>
          <CardDescription>Inserisci la password per accedere</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la password..."
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? "Verifica..." : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ────────────────────────────────────────────
// Question Editor
// ────────────────────────────────────────────
function QuestionEditor({
  question,
  onChange,
  onDelete,
}: {
  question: FormQuestion
  onChange: (q: FormQuestion) => void
  onDelete: () => void
}) {
  const update = (patch: Partial<FormQuestion>) => {
    onChange({ ...question, ...patch } as FormQuestion)
  }

  return (
    <div className="border rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripVertical className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <Badge className={`text-xs flex-shrink-0 ${typeBadgeColor(question.type)}`}>
            {QUESTION_TYPES.find((t) => t.value === question.type)?.label || question.type}
          </Badge>
          <code className="text-xs text-neutral-500 truncate">{question.key}</code>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-neutral-500">Key (campo)</Label>
          <Input
            value={question.key}
            onChange={(e) => update({ key: e.target.value })}
            placeholder="nomeDelCampo"
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-neutral-500">Tipo</Label>
          <Select value={question.type} onValueChange={(v) => update({ type: v as FormQuestion["type"] })}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-neutral-500">Label (domanda)</Label>
        <Input
          value={question.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="La domanda da mostrare all'utente"
          className="text-sm"
        />
      </div>

      {(question.type === "text" || question.type === "textarea" || question.type === "email" || question.type === "tel" || question.type === "url" || question.type === "number") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-neutral-500">Placeholder</Label>
            <Input
              value={question.placeholder || ""}
              onChange={(e) => update({ placeholder: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              checked={question.required || false}
              onChange={(e) => update({ required: e.target.checked })}
              id={`req-${question.key}`}
              className="rounded"
            />
            <Label htmlFor={`req-${question.key}`} className="text-sm cursor-pointer">Obbligatorio</Label>
          </div>
        </div>
      )}

      {question.type === "slider" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Min</Label>
              <Input type="number" value={question.min ?? 1} onChange={(e) => update({ min: Number(e.target.value) })} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Max</Label>
              <Input type="number" value={question.max ?? 5} onChange={(e) => update({ max: Number(e.target.value) })} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Step</Label>
              <Input type="number" value={question.step ?? 1} onChange={(e) => update({ step: Number(e.target.value) })} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Default</Label>
              <Input type="number" value={question.defaultValue ?? 3} onChange={(e) => update({ defaultValue: Number(e.target.value) })} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Label min</Label>
              <Input value={question.minLabel || ""} onChange={(e) => update({ minLabel: e.target.value })} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-500">Label max</Label>
              <Input value={question.maxLabel || ""} onChange={(e) => update({ maxLabel: e.target.value })} className="text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-neutral-500">Testo di aiuto</Label>
            <Input value={question.helperText || ""} onChange={(e) => update({ helperText: e.target.value })} className="text-sm" />
          </div>
        </>
      )}

      {question.type === "radio" && (
        <div className="space-y-2">
          <Label className="text-xs text-neutral-500">Opzioni (una per riga)</Label>
          <Textarea
            value={(question.options || []).join("\n")}
            onChange={(e) => update({ options: e.target.value.split("\n") })}
            placeholder={"Opzione 1\nOpzione 2\nOpzione 3"}
            rows={4}
            className="text-sm font-mono"
          />
        </div>
      )}

      {question.helperText && question.type !== "slider" && (
        <div className="space-y-1">
          <Label className="text-xs text-neutral-500">Testo di aiuto</Label>
          <Input value={question.helperText || ""} onChange={(e) => update({ helperText: e.target.value })} className="text-sm" />
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────
// Section Editor
// ────────────────────────────────────────────
function SectionEditor({
  section,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  section: FormSection
  index: number
  total: number
  onChange: (s: FormSection) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [open, setOpen] = useState(false)

  const updateSection = (patch: Partial<FormSection>) => {
    onChange({ ...section, ...patch })
  }

  const updateQuestion = (qIndex: number, q: FormQuestion) => {
    const updated = [...section.questions]
    updated[qIndex] = q
    updateSection({ questions: updated })
  }

  const deleteQuestion = (qIndex: number) => {
    updateSection({ questions: section.questions.filter((_, i) => i !== qIndex) })
  }

  const addQuestion = () => {
    const newQ: FormQuestion = {
      key: `nuovoCampo_${Date.now()}`,
      label: "Nuova domanda",
      type: "text",
      placeholder: "",
    }
    updateSection({ questions: [...section.questions, newQ] })
  }

  const moveQuestion = (from: number, to: number) => {
    if (to < 0 || to >= section.questions.length) return
    const arr = [...section.questions]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    updateSection({ questions: arr })
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-lg bg-neutral-50 overflow-hidden">
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-neutral-100 transition-colors text-left min-w-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{section.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-neutral-900">{section.title}</p>
                  <p className="text-xs text-neutral-500">{section.description} &middot; {section.questions.length} domande</p>
                </div>
              </div>
              {open ? <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-1 px-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={index === 0} className="h-7 w-7 p-0">
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={index === total - 1} className="h-7 w-7 p-0">
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-neutral-500">Titolo sezione</Label>
                <Input value={section.title} onChange={(e) => updateSection({ title: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-500">Icona</Label>
                <Input value={section.icon} onChange={(e) => updateSection({ icon: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-500">Descrizione</Label>
                <Input value={section.description} onChange={(e) => updateSection({ description: e.target.value })} className="text-sm" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Domande ({section.questions.length})</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="w-3 h-3 mr-1" /> Aggiungi domanda
                </Button>
              </div>

              {section.questions.map((q, qIdx) => (
                <div key={`${q.key}-${qIdx}`} className="relative">
                  {qIdx > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-2 left-1/2 -translate-x-1/2 h-5 w-5 p-0 z-10 bg-white border shadow-sm"
                      onClick={() => moveQuestion(qIdx, qIdx - 1)}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                  )}
                  <QuestionEditor
                    question={q}
                    onChange={(updated) => updateQuestion(qIdx, updated)}
                    onDelete={() => deleteQuestion(qIdx)}
                  />
                  {qIdx < section.questions.length - 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-5 w-5 p-0 z-10 bg-white border shadow-sm"
                      onClick={() => moveQuestion(qIdx, qIdx + 1)}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// ────────────────────────────────────────────
// Form Config Editor
// ────────────────────────────────────────────
function FormConfigEditor({ tipo }: { tipo: AnalysisType }) {
  const [sections, setSections] = useState<FormSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const getDefaultConfig = useCallback(() => {
    return tipo === "analisi_lampo"
      ? DEFAULT_ANALISI_LAMPO_CONFIG
      : DEFAULT_DIAGNOSI_STRATEGICA_CONFIG
  }, [tipo])

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/setup/form?tipo=${tipo}`)
      const json = await res.json()
      if (json.data?.config && Array.isArray(json.data.config) && json.data.config.length > 0) {
        setSections(json.data.config)
      } else {
        setSections(structuredClone(getDefaultConfig()))
      }
    } catch {
      setSections(structuredClone(getDefaultConfig()))
    } finally {
      setLoading(false)
    }
  }, [tipo, getDefaultConfig])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch("/api/setup/form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, config: sections }),
      })
      if (res.ok) {
        setStatus("Salvato con successo!")
      } else {
        setStatus("Errore nel salvataggio")
      }
    } catch {
      setStatus("Errore di connessione")
    } finally {
      setSaving(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  const updateSection = (index: number, s: FormSection) => {
    const updated = [...sections]
    updated[index] = s
    setSections(updated)
  }

  const deleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index))
  }

  const addSection = () => {
    setSections([...sections, {
      title: "Nuova sezione",
      icon: "📋",
      description: `STEP ${sections.length + 1} - Nuova sezione`,
      questions: [],
    }])
  }

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return
    const arr = [...sections]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    setSections(arr)
  }

  const resetToDefault = () => {
    if (confirm("Vuoi ripristinare la configurazione di default? Le modifiche non salvate andranno perse.")) {
      setSections(structuredClone(getDefaultConfig()))
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-neutral-500">
        Caricamento configurazione form...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" /> Configurazione Form
          </h3>
          <p className="text-sm text-neutral-500">{sections.length} sezioni configurate</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            Ripristina default
          </Button>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="w-3 h-3 mr-1" /> Aggiungi sezione
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-3 h-3 mr-1" /> {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </div>

      {status && (
        <p className={`text-sm px-3 py-2 rounded-md ${status.includes("successo") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {status}
        </p>
      )}

      <div className="space-y-3">
        {sections.map((section, idx) => (
          <SectionEditor
            key={`${section.title}-${idx}`}
            section={section}
            index={idx}
            total={sections.length}
            onChange={(s) => updateSection(idx, s)}
            onDelete={() => deleteSection(idx)}
            onMoveUp={() => moveSection(idx, idx - 1)}
            onMoveDown={() => moveSection(idx, idx + 1)}
          />
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// Prompt Editor
// ────────────────────────────────────────────
function PromptEditor({ tipo }: { tipo: AnalysisType }) {
  const [promptGenerale, setPromptGenerale] = useState("")
  const [promptCompetitor, setPromptCompetitor] = useState("")
  const [promptRiscrittura, setPromptRiscrittura] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/setup/prompt?tipo=${tipo}`)
        const json = await res.json()
        if (json.data) {
          setPromptGenerale(json.data.prompt_generale || "")
          setPromptCompetitor(json.data.prompt_competitor || "")
          setPromptRiscrittura(json.data.prompt_riscrittura || "")
        }
      } catch {
        // keep defaults
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tipo])

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch("/api/setup/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          prompt_generale: promptGenerale,
          prompt_competitor: promptCompetitor,
          prompt_riscrittura: promptRiscrittura,
        }),
      })
      if (res.ok) {
        setStatus("Prompt salvati con successo!")
      } else {
        setStatus("Errore nel salvataggio")
      }
    } catch {
      setStatus("Errore di connessione")
    } finally {
      setSaving(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-neutral-500">
        Caricamento prompt...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Prompt AI
          </h3>
          <p className="text-sm text-neutral-500">Configura i prompt per la generazione delle diagnosi</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-3 h-3 mr-1" /> {saving ? "Salvataggio..." : "Salva prompt"}
        </Button>
      </div>

      {status && (
        <p className={`text-sm px-3 py-2 rounded-md ${status.includes("successo") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {status}
        </p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prompt Generale</CardTitle>
            <CardDescription className="text-sm">
              Prompt principale per la generazione della diagnosi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={promptGenerale}
              onChange={(e) => setPromptGenerale(e.target.value)}
              placeholder="Inserisci il prompt generale per la generazione della diagnosi..."
              rows={10}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prompt Competitor (Deep Research)</CardTitle>
            <CardDescription className="text-sm">
              Prompt per l'analisi approfondita dei competitor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={promptCompetitor}
              onChange={(e) => setPromptCompetitor(e.target.value)}
              placeholder="Inserisci il prompt per l'analisi competitor..."
              rows={10}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prompt Riscrittura Finale</CardTitle>
            <CardDescription className="text-sm">
              Prompt per la riscrittura e raffinamento finale della diagnosi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={promptRiscrittura}
              onChange={(e) => setPromptRiscrittura(e.target.value)}
              placeholder="Inserisci il prompt per la riscrittura finale..."
              rows={10}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// Analysis Tab Content
// ────────────────────────────────────────────
function AnalysisTabContent({ tipo }: { tipo: AnalysisType }) {
  const [activeSubTab, setActiveSubTab] = useState<"form" | "prompt">("form")

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeSubTab === "form" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSubTab("form")}
        >
          <Eye className="w-4 h-4 mr-1" /> Form
        </Button>
        <Button
          variant={activeSubTab === "prompt" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSubTab("prompt")}
        >
          <Sparkles className="w-4 h-4 mr-1" /> Prompt AI
        </Button>
      </div>

      {activeSubTab === "form" && <FormConfigEditor tipo={tipo} />}
      {activeSubTab === "prompt" && <PromptEditor tipo={tipo} />}
    </div>
  )
}

const TIPO_LABELS: Record<string, string> = {
  analisi_lampo: "Analisi Lampo",
  diagnosi_strategica: "Diagnosi Strategica",
}

// ────────────────────────────────────────────
// Diagnosi List Section
// ────────────────────────────────────────────
function DiagnosiListSection() {
  const [diagnosi, setDiagnosi] = useState<
    Array<{
      id: string
      user_id: string
      tipo: string
      secret_token: string
      enabled: boolean
      created_at: string
      updated_at: string
      user_email?: string | null
      user_label: string
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDiagnosi = async () => {
      try {
        const res = await fetch("/api/setup/diagnosi")
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || "Errore nel caricamento")
          return
        }
        setDiagnosi(json.diagnosi ?? [])
      } catch {
        setError("Impossibile connettersi al server")
      } finally {
        setLoading(false)
      }
    }
    fetchDiagnosi()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-neutral-500">Caricamento diagnosi...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (diagnosi.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
            <FileText className="mb-4 h-12 w-12" />
            <p className="text-lg font-medium">Nessuna diagnosi</p>
            <p className="text-sm mt-1">Le diagnosi generate appariranno qui.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Elenco diagnosi
        </CardTitle>
        <CardDescription>
          Tutte le diagnosi generate. Clicca su Modifica per accedere alla pagina di revisione.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data creazione</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {diagnosi.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.user_label}</TableCell>
                <TableCell>{TIPO_LABELS[d.tipo] ?? d.tipo}</TableCell>
                <TableCell>
                  {new Date(d.created_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant={d.enabled ? "default" : "secondary"}>
                    {d.enabled ? "Attiva" : "Bozza"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/review/${d.secret_token}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Modifica
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ────────────────────────────────────────────
// Main Setup Page
// ────────────────────────────────────────────
export default function SetupPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/setup/auth")
        const data = await res.json()
        if (data.authenticated) {
          const params = new URLSearchParams(window.location.search)
          const token = params.get("token")
          const expectedToken = token
          if (expectedToken) {
            setAuthenticated(true)
          }
        }
      } catch {
        // not authenticated
      } finally {
        setChecking(false)
      }
    }
    checkAuth()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-500">Verifica accesso...</p>
      </div>
    )
  }

  if (!authenticated) {
    return <PasswordGate onAuth={() => setAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Setup Configurazione</h1>
          <p className="text-neutral-600 mt-1">Gestisci form e prompt per le analisi</p>
        </div>

        <Tabs defaultValue="analisi_lampo" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="analisi_lampo">Analisi Lampo</TabsTrigger>
            <TabsTrigger value="diagnosi_strategica">Diagnosi Strategica</TabsTrigger>
            <TabsTrigger value="diagnosi">Diagnosi</TabsTrigger>
          </TabsList>

          <TabsContent value="analisi_lampo">
            <AnalysisTabContent tipo="analisi_lampo" />
          </TabsContent>

          <TabsContent value="diagnosi_strategica">
            <AnalysisTabContent tipo="diagnosi_strategica" />
          </TabsContent>

          <TabsContent value="diagnosi">
            <DiagnosiListSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
