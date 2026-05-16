"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Check, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { hasDiagnosiEnabled } from "@/app/actions/database"
import { DynamicFormRenderer } from "@/components/form/DynamicFormRenderer"
import type { FormSection } from "@/lib/setup-seed"

interface Competitor {
  nomeAzienda: string
  sitoWeb: string
}

export default function AnalisiLampoForm() {
  const [phonePrefix, setPhonePrefix] = useState("+39")
  const [competitors, setCompetitors] = useState<Competitor[]>([
    { nomeAzienda: "", sitoWeb: "" },
    { nomeAzienda: "", sitoWeb: "" },
  ])
  const [currentSection, setCurrentSection] = useState(0)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [diagnosiReady, setDiagnosiReady] = useState<boolean | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [product, setProduct] = useState<"analisi-lampo" | "diagnosi-strategica">("analisi-lampo")
  const [savedSectionIndices, setSavedSectionIndices] = useState<Set<number>>(new Set())
  const [configSections, setConfigSections] = useState<FormSection[]>([])
  const [configLoading, setConfigLoading] = useState(true)

  const buildInitialFormData = (sections: FormSection[]): Record<string, string | number> => {
    const data: Record<string, string | number> = {}
    for (const section of sections) {
      for (const q of section.questions) {
        if (q.type === "competitors") continue
        if (data[q.key] !== undefined) continue
        if (q.type === "slider") {
          data[q.key] = q.defaultValue ?? 3
        } else if (q.type === "number") {
          data[q.key] = 0
        } else {
          data[q.key] = ""
        }
      }
    }
    return data
  }

  const [formData, setFormData] = useState<Record<string, string | number>>({})

  const sections = useMemo(() => {
    const list = [...configSections]
    const last = list[list.length - 1]
    if (!last || last.title !== "Conferma") {
      list.push({ title: "Conferma", icon: "✅", description: "Conferma e Invia", questions: [] })
    }
    return list
  }, [configSections])

  useEffect(() => {
    const tipo = product === "diagnosi-strategica" ? "diagnosi_strategica" : "analisi_lampo"
    fetch(`/api/form-config?tipo=${tipo}`)
      .then((res) => res.json())
      .then((json) => {
        const config = json?.data?.config
        if (config && Array.isArray(config) && config.length > 0) {
          setConfigSections(config)
          setFormData((prev) => {
            const initial = buildInitialFormData(config)
            return Object.keys(prev).length === 0 ? initial : { ...initial, ...prev }
          })
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false))
  }, [product])

  const progressPercentage = sections.length > 0 ? ((currentSection + 1) / sections.length) * 100 : 0

  const addCompetitor = () => {
    setCompetitors([...competitors, { nomeAzienda: "", sitoWeb: "" }])
  }

  const removeCompetitor = (index: number) => {
    if (competitors.length > 2) {
      setCompetitors(competitors.filter((_, i) => i !== index))
    }
  }

  const updateCompetitor = (index: number, field: keyof Competitor, value: string) => {
    const updated = [...competitors]
    updated[index][field] = value
    setCompetitors(updated)
  }

  const validateCurrentSection = (): boolean => {
    const section = sections[currentSection]
    if (!section) return true
    for (const q of section.questions) {
      if (q.type === "competitors") {
        if (
          competitors.length < 2 ||
          !competitors.slice(0, 2).every((c) => c.nomeAzienda.trim() !== "" && c.sitoWeb.trim() !== "")
        ) {
          return false
        }
      } else if (q.required) {
        const val = formData[q.key]
        if (val === undefined || val === null || String(val).trim() === "") return false
      }
    }
    return true
  }

  const handleNext = async () => {
    if (currentSection === sections.length - 1) return
    if (!validateCurrentSection()) {
      alert("Per favore, compila tutti i campi obbligatori prima di continuare.")
      return
    }
    const success = await handleAutoSave()
    if (success && currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1)
    }
  }

  const handleAutoSave = async (): Promise<boolean> => {
    setIsSaving(true)
    try {
      const sectionData = getSectionData(currentSection)

      const response = await fetch("/api/auto-save-section", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectionIndex: currentSection,
          titolo: sections[currentSection].title,
          data: sectionData,
          userId,
          tipo: product === "diagnosi-strategica" ? "diagnosi_strategica" : "analisi_lampo",
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("[v0] Section saved successfully")
        setSavedSectionIndices((prev) => new Set([...prev, currentSection]))
        return true
      }
      alert("Errore durante il salvataggio. Riprova.")
      return false
    } catch (error) {
      console.error("[v0] Error auto-saving:", error)
      alert("Errore durante il salvataggio. Riprova.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Rileva quando l'utente chiude il browser/pagina
  useEffect(() => {
    const initialize = async () => {
      if (typeof window === "undefined" || isInitialized) return

      const params = new URLSearchParams(window.location.search)
      const productParam = params.get("product")
      const productToUse = productParam === "diagnosi-strategica" ? "diagnosi-strategica" : "analisi-lampo"
      if (productParam === "diagnosi-strategica") {
        setProduct("diagnosi-strategica")
      }

      let resolvedUserId = params.get("userId") || params.get("user_id")

      if (!resolvedUserId) {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        resolvedUserId = user?.id || null
      }

      if (!resolvedUserId) return

      setUserId(resolvedUserId)
      setIsInitialized(true)

      try {
        const response = await fetch("/api/init-form", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: resolvedUserId,
            tipo: productToUse === "diagnosi-strategica" ? "diagnosi_strategica" : "analisi_lampo",
          }),
        })

        const result = await response.json()

        if (result.success) {
          console.log("[v0] Form initialized")

          if (result.hasExistingData && result.savedData) {
            console.log("[v0] Loading saved data:", result.savedData)
            loadSavedData(result.savedData)
          }
        }
      } catch (error) {
        console.error("[v0] Error initializing form:", error)
      }
    }

    initialize()

    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (currentSection > 0 && !showSuccess && userId) {
        try {
          const urlParams = new URLSearchParams(window.location.search)
          const tipoToSend = urlParams.get("product") === "diagnosi-strategica" ? "diagnosi_strategica" : "analisi_lampo"
          navigator.sendBeacon(
            "/api/update-form-status",
            JSON.stringify({
              status: "interrupted",
              userId,
              tipo: tipoToSend,
            }),
          )
        } catch (error) {
          console.error("[v0] Error updating form status:", error)
        }
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [currentSection, showSuccess, userId, isInitialized])

  const loadSavedData = (savedData: { [key: number]: Record<string, unknown> }) => {
    const newFormData = { ...formData }
    let highestSectionWithData = -1

    for (const idxStr of Object.keys(savedData)) {
      const i = Number(idxStr)
      const data = savedData[i]
      if (!data) continue
      highestSectionWithData = i
      for (const [key, val] of Object.entries(data)) {
        if (key === "competitors" && Array.isArray(val)) {
          setCompetitors(val as Competitor[])
        } else if (key === "telefono" && typeof val === "string") {
          newFormData.telefono = val.replace(phonePrefix, "").trim() || ""
        } else if (val !== undefined && val !== null) {
          newFormData[key] = val as string | number
        }
      }
    }

    setFormData(newFormData)

    const savedIndices = new Set(Object.keys(savedData).map(Number))
    setSavedSectionIndices(savedIndices)

    if (highestSectionWithData >= 0) {
      setCurrentSection(highestSectionWithData + 1)
      console.log("[v0] Resuming from section:", highestSectionWithData + 1)
    }
  }

  const getSectionData = (sectionIndex: number) => {
    const section = sections[sectionIndex]
    if (!section) return {}
    const data: Record<string, unknown> = {}
    for (const q of section.questions) {
      if (q.type === "competitors") {
        data.competitors = competitors
      } else if (q.key === "telefono") {
        data.telefono = `${phonePrefix} ${formData.telefono ?? ""}`.trim()
      } else {
        data[q.key] = formData[q.key]
      }
    }
    return data
  }

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const allSections = sections
        .slice(0, -1)
        .map((s, i) => ({
          sectionIndex: i,
          titolo: s.title,
          data: getSectionData(i),
        }))

      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sections: allSections,
          userId,
          tipo: product === "diagnosi-strategica" ? "diagnosi_strategica" : "analisi_lampo",
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Errore durante l'invio")
      }

      console.log("[v0] Form submitted successfully:", result)
      setShowSuccess(true)
      if (userId) {
        const tipo = product === "diagnosi-strategica" ? "diagnosi_strategica" : "analisi_lampo"
        const ready = await hasDiagnosiEnabled(userId, tipo)
        setDiagnosiReady(ready)
      }
    } catch (error) {
      console.error("Errore durante l'invio:", error)
      alert("Si è verificato un errore durante l'invio del form. Riprova.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value })
  }

  const maxSavedIndex = savedSectionIndices.size > 0 ? Math.max(...savedSectionIndices) : -1
  const maxAccessibleSection = Math.max(currentSection, maxSavedIndex + 1)

  const handleSectionClick = (targetIndex: number) => {
    if (targetIndex > maxAccessibleSection) return

    if (targetIndex <= currentSection) {
      setCurrentSection(targetIndex)
    } else {
      if (!validateCurrentSection()) {
        alert("Per favore, compila tutti i campi obbligatori prima di continuare.")
        return
      }
      setCurrentSection(targetIndex)
    }
  }

  if (showSuccess) {
    const isDiagnosi = product === "diagnosi-strategica"
    const giorniAttesa = isDiagnosi ? "10" : "3"
    const diagnosiLink = isDiagnosi ? "/diagnosi/diagnosi-strategica" : "/diagnosi/analisi-lampo"
    const labelTipo = isDiagnosi ? "Diagnosi" : "Analisi"
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-xl border-2 border-green-200">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                {isDiagnosi ? "Diagnosi Inviata con Successo!" : "Analisi Inviata con Successo!"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6 pb-8">
              <p className="text-lg text-gray-700 leading-relaxed">Perfetto, hai completato tutte le domande!</p>
              <p className="text-lg text-gray-700 leading-relaxed">
                {isDiagnosi ? (
                  <>
                    <strong>Entro {giorniAttesa} giorni</strong> riceverai la tua <strong>Diagnosi Strategica</strong> con
                    raccomandazioni step-by-step per la crescita digitale.
                  </>
                ) : (
                  <>
                    <strong>Entro {giorniAttesa} giorni</strong> riceverai il nostro <strong>report di 10 pagine</strong>{" "}
                    con punteggi, grafici e le <strong>3 azioni pratiche immediate</strong> pensate per te.
                  </>
                )}
              </p>
              <div className="flex flex-col gap-3 mt-6">
                {diagnosiReady ? (
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white">
                    <Link href={diagnosiLink}>Visualizza la tua {labelTipo}</Link>
                  </Button>
                ) : (
                  <div>
                    <button
                      disabled
                      className="w-full max-w-md mx-auto bg-neutral-300 text-neutral-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed opacity-90"
                    >
                      Attendi che la diagnosi sia pronta
                    </button>
                    <p className="text-neutral-600 text-sm mt-2">
                      La {labelTipo.toLowerCase()} sarà disponibile in circa {giorniAttesa} giorni. Ti avviseremo quando
                      potrai consultarla.
                    </p>
                  </div>
                )}
                <Button asChild variant="outline" className="border-neutral-300">
                  <Link href="/prodotti">Torna ai prodotti</Link>
                </Button>
              </div>
              {!isDiagnosi && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                  <p className="text-base text-gray-700">
                    Se per qualsiasi motivo non dovessi trovare utile l'Analisi Lampo, puoi chiedere il{" "}
                    <strong>rimborso completo entro 7 giorni dalla consegna</strong>.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (configLoading && configSections.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Caricamento configurazione...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
            <Link href="/prodotti">
              Indietro: torna ai prodotti
            </Link>
          </Button>
        </div>

        <div className="text-center mb-8">
          <img src="/logo-metodo-cantiere.png" alt="Metodo Cantiere Logo" className="h-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2 text-balance">
            {product === "diagnosi-strategica" ? "Diagnosi Strategica Metodo Cantiere" : "Analisi Lampo Metodo Cantiere"}
          </h1>
          <p className="text-gray-600 text-lg">
            {product === "diagnosi-strategica"
              ? "Analisi approfondita e roadmap per la crescita digitale."
              : "La radiografia veloce della tua impresa digitale."}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-900">
              Sezione {currentSection + 1} di {sections.length}
            </span>
            <span className="text-sm text-gray-600">{Math.round(progressPercentage)}% completato</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#FF6B00] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Section Indicators */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {sections.map((section, index) => {
              const isAccessible = index <= maxAccessibleSection
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSectionClick(index)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    index === currentSection
                      ? "bg-[#FF6B00] text-white"
                      : isAccessible
                        ? "bg-orange-100 text-[#FF6B00] cursor-pointer"
                        : "bg-gray-100 text-gray-600 cursor-not-allowed opacity-60"
                  }`}
                >
                  {isAccessible && index < currentSection && <Check className="inline w-3 h-3 mr-1" />}
                  {section.icon} {section.title}
                </button>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{sections[currentSection]?.title ?? "Caricamento..."}</CardTitle>
              <CardDescription className="text-base">{sections[currentSection]?.description ?? ""}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {configLoading ? (
                <div className="py-12 text-center text-gray-500">Caricamento...</div>
              ) : sections[currentSection]?.questions.length > 0 ? (
                <DynamicFormRenderer
                  questions={sections[currentSection].questions}
                  formData={formData}
                  updateFormData={updateFormData}
                  competitors={competitors}
                  addCompetitor={addCompetitor}
                  removeCompetitor={removeCompetitor}
                  updateCompetitor={updateCompetitor}
                  phonePrefix={phonePrefix}
                  setPhonePrefix={setPhonePrefix}
                />
              ) : currentSection === sections.length - 1 ? (
                <div className="space-y-8 py-8">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {product === "diagnosi-strategica"
                        ? "Sei pronto per inviare la tua Diagnosi Strategica!"
                        : "Sei pronto per inviare la tua Analisi Lampo!"}
                    </h3>
                    <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                      Hai completato tutte le sezioni del questionario. Clicca sul bottone qui sotto per confermare e
                      inviare i tuoi dati.
                    </p>
                    <p className="text-base text-gray-600 max-w-2xl mx-auto">
                      {product === "diagnosi-strategica"
                        ? "Riceverai entro 10 giorni la tua Diagnosi Strategica con raccomandazioni step-by-step per la crescita digitale."
                        : "Riceverai entro 3 giorni un report completo di 10 pagine con analisi dettagliata, grafici e 3 azioni pratiche immediate per la tua azienda."}
                    </p>
                  </div>

                  <div className="flex justify-center pt-6">
                    <Button
                      type="submit"
                      size="lg"
                      className="text-lg px-12 py-6 bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Invio in corso..." : "Conferma e Invia"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </form>

        {currentSection < sections.length - 1 && (
          <div className="flex justify-between gap-4 mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentSection === 0}
              className="text-base bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Indietro
            </Button>
            <Button
              onClick={handleNext}
              disabled={isSaving}
              className="text-base bg-[#FF6B00] hover:bg-[#E55F00] text-white"
            >
              {isSaving ? "Salvataggio..." : "Salva e Continua"} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {currentSection === sections.length - 1 && (
          <div className="flex justify-start mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="text-base bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Indietro
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
