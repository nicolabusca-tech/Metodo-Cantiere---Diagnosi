"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ChevronLeft, ChevronRight, Check, CheckCircle2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

const countryCodes = [
  { code: "+39", country: "IT" },
  { code: "+1", country: "US" },
  { code: "+44", country: "UK" },
  { code: "+33", country: "FR" },
  { code: "+49", country: "DE" },
  { code: "+34", country: "ES" },
  { code: "+41", country: "CH" },
  { code: "+43", country: "AT" },
  { code: "+32", country: "BE" },
  { code: "+31", country: "NL" },
  { code: "+351", country: "PT" },
  { code: "+30", country: "GR" },
  { code: "+48", country: "PL" },
  { code: "+420", country: "CZ" },
  { code: "+36", country: "HU" },
  { code: "+46", country: "SE" },
  { code: "+47", country: "NO" },
  { code: "+45", country: "DK" },
  { code: "+358", country: "FI" },
  { code: "+353", country: "IE" },
  { code: "+7", country: "RU" },
  { code: "+86", country: "CN" },
  { code: "+81", country: "JP" },
  { code: "+82", country: "KR" },
  { code: "+91", country: "IN" },
  { code: "+61", country: "AU" },
  { code: "+55", country: "BR" },
  { code: "+52", country: "MX" },
  { code: "+54", country: "AR" },
  { code: "+27", country: "ZA" },
]

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
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [product, setProduct] = useState<"analisi-lampo" | "diagnosi-strategica">("analisi-lampo")

  const [formData, setFormData] = useState({
    // Sezione 0: Dati aziendali (ex sezione 1)
    nomeReferente: "",
    nomeAzienda: "",
    descrizioneAzienda: "",
    ruoloReferente: "",
    emailAziendale: "",
    telefono: "",
    sitoWeb: "",
    profiloSocial: "",
    settorePrincipale: "",
    zonaOperativa: "",
    rangeFatturato: "",

    // Sezione 1: Presenza Digitale & Branding (ex sezione 2)
    sitoWebFunzionante: 3,
    googleMyBusiness: 3,
    presenzaSocial: 3,

    // Sezione 2: Funnel & Acquisizione Contatti (ex sezione 3)
    diversificazioneCanali: 3,
    nuoviContattiMese: 3,
    tassoConversione: 3,
    formCTA: 3,

    // Sezione 3: Gestione Interna & CRM (ex sezione 4)
    usoCRM: 3,
    preventiviMese: 3,
    followUpPreventivo: 3,
    misurazioneTassoAccettazione: 3,
    conoscenzaColliBottiglia: 3, // This field was present in the original code but not in the updates. Keeping it for completeness.

    // Sezione 4: Follow-up & Tempi di Risposta (ex sezione 5)
    velocitaRisposta: 3,
    chiRisponde: 3,
    sistemaFollowUp: 3,

    // Sezione 5: Competitor & Posizionamento (ex sezione 6)
    individuazioneCompetitor: 3,
    propostoValore: 3,
    visibilitaOnline: 3,

    // Sezione 6: KPI Sintetici (ex KPI Sintetici)
    tempoMedioRisposta: "",
    percentualeFollowUp: "",
    leadMensili: "",
    tassoChiusura: "",

    // Sezione 7: Consapevolezza & Obiettivi (ex sezione 7)
    chiarezzaObiettivo: 3,
    realismoObiettivo: 3,
  })

  const sections = [
    { title: "Dati aziendali", icon: "🧱", description: "STEP 1 - Informazioni base della tua impresa" },
    { title: "Visibilità web", icon: "🧱", description: "STEP 2 - Presenza Digitale & Branding" },
    { title: "Acquisizione contatti", icon: "🧱", description: "STEP 3 - Funnel & Acquisizione Contatti" },
    { title: "Gestione interna", icon: "🧱", description: "STEP 4 - Gestione Interna & CRM" },
    { title: "Follow-up", icon: "🧱", description: "STEP 5 - Follow-up & Tempi di Risposta" },
    { title: "Competitor", icon: "🧱", description: "STEP 6 - Competitor & Posizionamento" },
    // Aggiornato titolo e icona per KPI Sintetici
    { title: "KPI Sintetici", icon: "📊", description: "STEP 7 - KPI Sintetici" },
    { title: "Obiettivi", icon: "📈", description: "STEP 8 - Consapevolezza & Obiettivi" }, // Changed icon to chart
    // Aggiornato numero step per Conferma
    { title: "Conferma", icon: "✅", description: "STEP 9 - Conferma e Invia" },
  ]

  const progressPercentage = ((currentSection + 1) / sections.length) * 100

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
    switch (currentSection) {
      case 0: // Dati aziendali
        return formData.descrizioneAzienda.trim() !== "" && formData.profiloSocial.trim() !== ""
      case 1: // Presenza Digitale & Branding - All sliders required (have default value of 3)
        return true
      case 2: // Funnel & Acquisizione Contatti - All sliders required (have default value of 3)
        return true
      case 3: // Gestione Interna & CRM - All sliders required (have default value of 3)
        return true
      case 4: // Follow-up - All sliders required (have default value of 3)
        return true
      case 5: // Competitor - validazione almeno 2 competitor con dati completi
        return (
          competitors.length >= 2 &&
          competitors.slice(0, 2).every((c) => c.nomeAzienda.trim() !== "" && c.sitoWeb.trim() !== "")
        )
      case 6: // KPI Sintetici - tutti i campi obbligatori
        return (
          formData.tempoMedioRisposta.trim() !== "" &&
          formData.percentualeFollowUp.trim() !== "" &&
          formData.leadMensili.trim() !== "" &&
          formData.tassoChiusura.trim() !== ""
        )
      case 7: // Obiettivi - All sliders required (have default value of 3)
        return true
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (currentSection === 8) return
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

  const loadSavedData = (savedData: { [key: number]: any }) => {
    const newFormData = { ...formData }
    let highestSectionWithData = -1

    if (savedData[0]) {
      const data = savedData[0]
      newFormData.nomeReferente = data.nomeReferente || ""
      newFormData.nomeAzienda = data.nomeAzienda || ""
      newFormData.descrizioneAzienda = data.descrizioneAzienda || ""
      newFormData.ruoloReferente = data.ruoloReferente || ""
      newFormData.emailAziendale = data.emailAziendale || ""
      newFormData.telefono = data.telefono?.replace(phonePrefix, "").trim() || ""
      newFormData.sitoWeb = data.sitoWeb || ""
      newFormData.profiloSocial = data.profiloSocial || ""
      newFormData.settorePrincipale = data.settorePrincipale || ""
      newFormData.zonaOperativa = data.zonaOperativa || ""
      newFormData.rangeFatturato = data.rangeFatturato || ""
      highestSectionWithData = 0
    }

    if (savedData[1]) {
      const data = savedData[1]
      newFormData.sitoWebFunzionante = data.sitoWebFunzionante ?? 3
      newFormData.googleMyBusiness = data.googleMyBusiness ?? 3
      newFormData.presenzaSocial = data.presenzaSocial ?? 3
      highestSectionWithData = 1
    }

    if (savedData[2]) {
      const data = savedData[2]
      newFormData.diversificazioneCanali = data.diversificazioneCanali ?? 3
      newFormData.nuoviContattiMese = data.nuoviContattiMese ?? 3
      newFormData.tassoConversione = data.tassoConversione ?? 3
      newFormData.formCTA = data.formCTA ?? 3
      highestSectionWithData = 2
    }

    if (savedData[3]) {
      const data = savedData[3]
      newFormData.usoCRM = data.usoCRM ?? 3
      newFormData.preventiviMese = data.preventiviMese ?? 3
      newFormData.followUpPreventivo = data.followUpPreventivo ?? 3
      newFormData.misurazioneTassoAccettazione = data.misurazioneTassoAccettazione ?? 3
      newFormData.conoscenzaColliBottiglia = data.conoscenzaColliBottiglia ?? 3
      highestSectionWithData = 3
    }

    if (savedData[4]) {
      const data = savedData[4]
      newFormData.velocitaRisposta = data.velocitaRisposta ?? 3
      newFormData.chiRisponde = data.chiRisponde ?? 3
      newFormData.sistemaFollowUp = data.sistemaFollowUp ?? 3
      highestSectionWithData = 4
    }

    if (savedData[5]) {
      const data = savedData[5]
      newFormData.individuazioneCompetitor = data.individuazioneCompetitor ?? 3
      newFormData.propostoValore = data.propostoValore ?? 3
      newFormData.visibilitaOnline = data.visibilitaOnline ?? 3
      if (data.competitors && Array.isArray(data.competitors)) {
        setCompetitors(data.competitors)
      }
      highestSectionWithData = 5
    }

    if (savedData[6]) {
      const data = savedData[6]
      newFormData.tempoMedioRisposta = data.tempoMedioRisposta || ""
      newFormData.percentualeFollowUp = data.percentualeFollowUp || ""
      newFormData.leadMensili = data.leadMensili || ""
      newFormData.tassoChiusura = data.tassoChiusura || ""
      highestSectionWithData = 6
    }

    if (savedData[7]) {
      const data = savedData[7]
      newFormData.chiarezzaObiettivo = data.chiarezzaObiettivo ?? 3
      newFormData.realismoObiettivo = data.realismoObiettivo ?? 3
      highestSectionWithData = 7
    }

    setFormData(newFormData)

    if (highestSectionWithData >= 0) {
      setCurrentSection(highestSectionWithData + 1)
      console.log("[v0] Resuming from section:", highestSectionWithData + 1)
    }
  }

  const getSectionData = (sectionIndex: number) => {
    switch (sectionIndex) {
      case 0:
        return {
          nomeReferente: formData.nomeReferente,
          nomeAzienda: formData.nomeAzienda,
          descrizioneAzienda: formData.descrizioneAzienda,
          ruoloReferente: formData.ruoloReferente,
          emailAziendale: formData.emailAziendale,
          telefono: `${phonePrefix} ${formData.telefono}`,
          sitoWeb: formData.sitoWeb,
          profiloSocial: formData.profiloSocial,
          settorePrincipale: formData.settorePrincipale,
          zonaOperativa: formData.zonaOperativa,
          rangeFatturato: formData.rangeFatturato,
        }
      case 1:
        return {
          sitoWebFunzionante: formData.sitoWebFunzionante,
          googleMyBusiness: formData.googleMyBusiness,
          presenzaSocial: formData.presenzaSocial,
        }
      case 2:
        return {
          diversificazioneCanali: formData.diversificazioneCanali,
          nuoviContattiMese: formData.nuoviContattiMese,
          tassoConversione: formData.tassoConversione,
          formCTA: formData.formCTA,
        }
      case 3:
        return {
          usoCRM: formData.usoCRM,
          preventiviMese: formData.preventiviMese,
          followUpPreventivo: formData.followUpPreventivo,
          misurazioneTassoAccettazione: formData.misurazioneTassoAccettazione,
          conoscenzaColliBottiglia: formData.conoscenzaColliBottiglia,
        }
      case 4:
        return {
          velocitaRisposta: formData.velocitaRisposta,
          chiRisponde: formData.chiRisponde,
          sistemaFollowUp: formData.sistemaFollowUp,
        }
      case 5:
        return {
          individuazioneCompetitor: formData.individuazioneCompetitor,
          propostoValore: formData.propostoValore,
          visibilitaOnline: formData.visibilitaOnline,
          competitors,
        }
      case 6:
        return {
          tempoMedioRisposta: formData.tempoMedioRisposta,
          percentualeFollowUp: formData.percentualeFollowUp,
          leadMensili: formData.leadMensili,
          tassoChiusura: formData.tassoChiusura,
        }
      case 7:
        return {
          chiarezzaObiettivo: formData.chiarezzaObiettivo,
          realismoObiettivo: formData.realismoObiettivo,
        }
      default:
        return {}
    }
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
      const allSections = sections.slice(0, 8).map((s, i) => ({
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

  const handleSectionClick = (targetIndex: number) => {
    // Permetti solo di andare a sezioni precedenti o alla sezione corrente
    if (targetIndex <= currentSection) {
      setCurrentSection(targetIndex)
    } else {
      // Se prova ad andare avanti, valida prima la sezione corrente
      if (!validateCurrentSection()) {
        alert("Per favore, compila tutti i campi obbligatori prima di continuare.")
        return
      }
      // Se la validazione passa, permetti di andare alla sezione successiva
      if (targetIndex === currentSection + 1) {
        setCurrentSection(targetIndex)
      }
    }
  }

  if (showSuccess) {
    // Changed from isSubmitted to showSuccess
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-xl border-2 border-green-200">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">Analisi Inviata con Successo!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6 pb-8">
              <p className="text-lg text-gray-700 leading-relaxed">Perfetto, hai completato tutte le domande!</p>
              <p className="text-lg text-gray-700 leading-relaxed">
                <strong>Entro 3 giorni</strong> riceverai il nostro <strong>report di 10 pagine</strong> con punteggi,
                grafici e le <strong>3 azioni pratiche immediate</strong> pensate per te.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                <p className="text-base text-gray-700">
                  Se per qualsiasi motivo non dovessi trovare utile l'Analisi Lampo, puoi chiedere il{" "}
                  <strong>rimborso completo entro 7 giorni dalla consegna</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="outline" className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50">
            <Link href={product === "diagnosi-strategica" ? "/payment-diagnosi-strategica" : "/payment"}>
              Indietro: torna al riepilogo pagamento
            </Link>
          </Button>
        </div>

        <div className="text-center mb-8">
          <img src="/logo-metodo-cantiere.png" alt="Metodo Cantiere Logo" className="h-16 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2 text-balance">Analisi Lampo Metodo Cantiere®</h1>
          <p className="text-gray-600 text-lg">La radiografia veloce della tua impresa digitale.</p>
        </div>

        {/* Avviso importante */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded">
          <p className="text-blue-800 text-sm font-medium">
            ⚠️ Prenditi 5-10 minuti per riflettere sulle domande e fornire una risposta coerente con la tua azienda! Per favore, non chiudere la pagina o i tuoi dati andranno persi.
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
            {sections.map((section, index) => (
              <button
                key={index}
                onClick={() => handleSectionClick(index)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  index === currentSection
                    ? "bg-[#FF6B00] text-white"
                    : index < currentSection
                      ? "bg-orange-100 text-[#FF6B00] cursor-pointer"
                      : "bg-gray-100 text-gray-600 cursor-not-allowed opacity-60"
                }`}
              >
                {index < currentSection && <Check className="inline w-3 h-3 mr-1" />}
                {section.icon} {section.title}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">{sections[currentSection].title}</CardTitle>
              <CardDescription className="text-base">{sections[currentSection].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sezione 0: Dati aziendali */}
              {currentSection === 0 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="nomeReferente" className="text-base font-semibold">
                      Nome e cognome del referente
                    </Label>
                    <Input
                      id="nomeReferente"
                      value={formData.nomeReferente}
                      onChange={(e) => updateFormData("nomeReferente", e.target.value)}
                      placeholder="Mario Rossi"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nomeAzienda" className="text-base font-semibold">
                      Nome azienda
                    </Label>
                    <Input
                      id="nomeAzienda"
                      value={formData.nomeAzienda}
                      onChange={(e) => updateFormData("nomeAzienda", e.target.value)}
                      placeholder="Edil Costruzioni Srl"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descrizioneAzienda" className="text-base font-semibold">
                      Breve descrizione dell'azienda
                    </Label>
                    <Textarea
                      id="descrizioneAzienda"
                      value={formData.descrizioneAzienda}
                      onChange={(e) => updateFormData("descrizioneAzienda", e.target.value)}
                      placeholder="Descrivi brevemente la tua azienda, i servizi offerti e il mercato di riferimento..."
                      rows={4}
                      required
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ruoloReferente" className="text-base font-semibold">
                      Ruolo del referente
                    </Label>
                    <Input
                      id="ruoloReferente"
                      value={formData.ruoloReferente}
                      onChange={(e) => updateFormData("ruoloReferente", e.target.value)}
                      placeholder="Titolare / Direttore tecnico / Commerciale / Altro"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailAziendale" className="text-base font-semibold">
                      Email aziendale
                    </Label>
                    <Input
                      id="emailAziendale"
                      type="email"
                      value={formData.emailAziendale}
                      onChange={(e) => updateFormData("emailAziendale", e.target.value)}
                      placeholder="info@azienda.it"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono" className="text-base font-semibold">
                      Numero di telefono / WhatsApp
                    </Label>
                    <div className="flex gap-2">
                      <Select value={phonePrefix} onValueChange={setPhonePrefix}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {countryCodes.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.country} {country.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="telefono"
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => updateFormData("telefono", e.target.value)}
                        placeholder="123 456 7890"
                        className="text-base flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sitoWeb" className="text-base font-semibold">
                      Sito web
                    </Label>
                    <Input
                      id="sitoWeb"
                      type="url"
                      value={formData.sitoWeb}
                      onChange={(e) => updateFormData("sitoWeb", e.target.value)}
                      placeholder="www.tuaimpresa.it (se non c'è, indicare nessuno)"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profiloSocial" className="text-base font-semibold">
                      Profilo social maggiormente utilizzato
                    </Label>
                    <Input
                      id="profiloSocial"
                      type="text"
                      value={formData.profiloSocial}
                      onChange={(e) => updateFormData("profiloSocial", e.target.value)}
                      placeholder="Es: Instagram, LinkedIn, Facebook..."
                      required
                      className="text-base"
                    />
                    <p className="text-sm text-gray-500">Indicare il nome utente o l'URL del profilo</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="settorePrincipale" className="text-base font-semibold">
                      Settore principale
                    </Label>
                    <Input
                      id="settorePrincipale"
                      value={formData.settorePrincipale}
                      onChange={(e) => updateFormData("settorePrincipale", e.target.value)}
                      placeholder="Impresa edile / Impiantista / Prefabbricatore / Studio tecnico / Altro"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zonaOperativa" className="text-base font-semibold">
                      Zona operativa
                    </Label>
                    <Input
                      id="zonaOperativa"
                      value={formData.zonaOperativa}
                      onChange={(e) => updateFormData("zonaOperativa", e.target.value)}
                      placeholder="Regione o Provincia"
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Range di fatturato annuo</Label>
                    <RadioGroup
                      value={formData.rangeFatturato}
                      onValueChange={(value) => updateFormData("rangeFatturato", value)}
                    >
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="500k–1M €" id="fat1" />
                        <Label htmlFor="fat1" className="font-normal cursor-pointer text-base flex-1">
                          500k–1M €
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="1M–2M €" id="fat2" />
                        <Label htmlFor="fat2" className="font-normal cursor-pointer text-base flex-1">
                          1M–2M €
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="2–5M €" id="fat3" />
                        <Label htmlFor="fat3" className="font-normal cursor-pointer text-base flex-1">
                          2–5M €
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="oltre-5M €" id="fat4" />
                        <Label htmlFor="fat4" className="font-normal cursor-pointer text-base flex-1">
                          oltre 5M €
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* Sezione 1: Presenza Digitale & Branding */}
              {currentSection === 1 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Hai un sito web aziendale funzionante e aggiornato?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Assente</span>
                        <span className="font-medium">Valore: {formData.sitoWebFunzionante}</span>
                        <span>5 = Ottimizzato</span>
                      </div>
                      <Slider
                        value={[formData.sitoWebFunzionante]}
                        onValueChange={(value) => updateFormData("sitoWebFunzionante", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        5 = Ottimizzato per acquisizione contatti (CTA chiara, aggiornato)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Il tuo profilo Google My Business è attivo e curato?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Inesistente</span>
                        <span className="font-medium">Valore: {formData.googleMyBusiness}</span>
                        <span>5 = Curato</span>
                      </div>
                      <Slider
                        value={[formData.googleMyBusiness]}
                        onValueChange={(value) => updateFormData("googleMyBusiness", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">5 = Con foto recenti, post, recensioni gestite</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Quanto è presente e attiva la tua azienda sui social media pertinenti al settore?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Assente</span>
                        <span className="font-medium">Valore: {formData.presenzaSocial}</span>
                        <span>5 = Attivo</span>
                      </div>
                      <Slider
                        value={[formData.presenzaSocial]}
                        onValueChange={(value) => updateFormData("presenzaSocial", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        1 = Nessuna presenza o profilo abbandonato, 5 = Post costanti, interazioni, piano editoriale
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sezione 2: Funnel & Acquisizione Contatti */}
              {currentSection === 2 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Quanto sono diversificati i tuoi canali di acquisizione contatti?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Unico canale</span>
                        <span className="font-medium">Valore: {formData.diversificazioneCanali}</span>
                        <span>{"5 = 3+ canali"}</span>
                      </div>
                      <Slider
                        value={[formData.diversificazioneCanali]}
                        onValueChange={(value) => updateFormData("diversificazioneCanali", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        1 = Passaparola o un solo canale, 5 = Più di 3 canali (sito, Google, social, eventi, etc.)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Quanti nuovi contatti qualificati ricevi in media al mese?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>{"1 = < 5"}</span>
                        <span className="font-medium">Valore: {formData.nuoviContattiMese}</span>
                        <span>{"5 = > 30"}</span>
                      </div>
                      <Slider
                        value={[formData.nuoviContattiMese]}
                        onValueChange={(value) => updateFormData("nuoviContattiMese", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">{"1 = meno di 5, 5 = più di 30 / mese"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Conosci il tasso di conversione da contatto a preventivo o proposta?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Non lo so</span>
                        <span className="font-medium">Valore: {formData.tassoConversione}</span>
                        <span>{"5 = Sì, > 50%"}</span>
                      </div>
                      <Slider
                        value={[formData.tassoConversione]}
                        onValueChange={(value) => updateFormData("tassoConversione", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">{"5 = Conosco il tasso e supera il 50%"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Sul sito web ci sono form o CTA (Call To Action) chiari per la richiesta preventivo/contatto?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Nessuna</span>
                        <span className="font-medium">Valore: {formData.formCTA}</span>
                        <span>5 = Ottimizzate</span>
                      </div>
                      <Slider
                        value={[formData.formCTA]}
                        onValueChange={(value) => updateFormData("formCTA", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        1 = Nessun form o difficile da trovare, 5 = Form prominente, CTA ben visibile
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sezione 3: Gestione Interna & CRM */}
              {currentSection === 3 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Come gestite le lead e i contatti? Usate un CRM o strumenti di tracciamento strutturati?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Nessun CRM</span>
                        <span className="font-medium">Valore: {formData.usoCRM}</span>
                        <span>5 = CRM completo</span>
                      </div>
                      <Slider
                        value={[formData.usoCRM]}
                        onValueChange={(value) => updateFormData("usoCRM", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        1 = Excel o carta, 5 = CRM dedicato (HubSpot, Pipedrive, etc.)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Quanti preventivi o proposte commerciali preparate al mese in media?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>{"1 = < 5"}</span>
                        <span className="font-medium">Valore: {formData.preventiviMese}</span>
                        <span>{"5 = > 30"}</span>
                      </div>
                      <Slider
                        value={[formData.preventiviMese]}
                        onValueChange={(value) => updateFormData("preventiviMese", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">{"1 = meno di 5, 5 = oltre 30"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Fate follow-up strutturati dopo aver inviato un preventivo?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Mai</span>
                        <span className="font-medium">Valore: {formData.followUpPreventivo}</span>
                        <span>5 = Sempre</span>
                      </div>
                      <Slider
                        value={[formData.followUpPreventivo]}
                        onValueChange={(value) => updateFormData("followUpPreventivo", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        1 = Nessun follow-up, 5 = Follow-up tempestivo e calendarizzato
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Misurate il tasso di accettazione dei vostri preventivi?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = No</span>
                        <span className="font-medium">Valore: {formData.misurazioneTassoAccettazione}</span>
                        <span>5 = Sì</span>
                      </div>
                      <Slider
                        value={[formData.misurazioneTassoAccettazione]}
                        onValueChange={(value) => updateFormData("misurazioneTassoAccettazione", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        1 = Non misuriamo, 5 = Misuriamo regolarmente e ottimizziamo
                      </p>
                    </div>
                  </div>

                  {/* This field was in the original code but not in the updates, keeping it here */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Conoscete i colli di bottiglia del vostro processo di vendita/acquisizione?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Non li conosciamo</span>
                        <span className="font-medium">Valore: {formData.conoscenzaColliBottiglia}</span>
                        <span>5 = Li conosciamo e stiamo lavorando per risolverli</span>
                      </div>
                      <Slider
                        value={[formData.conoscenzaColliBottiglia]}
                        onValueChange={(value) => updateFormData("conoscenzaColliBottiglia", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        1 = Non sappiamo dove sono i problemi, 5 = Abbiamo individuato i problemi e abbiamo un piano
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sezione 4: Follow-up & Tempi di Risposta */}
              {currentSection === 4 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Quanto veloce è la vostra risposta ai contatti?</Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>{"1 = > 3 giorni"}</span>
                        <span className="font-medium">Valore: {formData.velocitaRisposta}</span>
                        <span>{"5 = < 2 ore"}</span>
                      </div>
                      <Slider
                        value={[formData.velocitaRisposta]}
                        onValueChange={(value) => updateFormData("velocitaRisposta", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        {"1 = Rispondiamo dopo più di 3 giorni, 5 = Rispondiamo entro 2 ore"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Chi risponde ai contatti?</Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>{"1 = Qualcuno non specificato"}</span>
                        <span className="font-medium">Valore: {formData.chiRisponde}</span>
                        <span>{"5 = Referente specifico"}</span>
                      </div>
                      <Slider
                        value={[formData.chiRisponde]}
                        onValueChange={(value) => updateFormData("chiRisponde", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        {"1 = Qualcuno non specificato, 5 = Referente specifico"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Utilizzate un sistema di follow-up strutturato?</Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = No</span>
                        <span className="font-medium">Valore: {formData.sistemaFollowUp}</span>
                        <span>{"5 = Sì"}</span>
                      </div>
                      <Slider
                        value={[formData.sistemaFollowUp]}
                        onValueChange={(value) => updateFormData("sistemaFollowUp", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        {"1 = Non usiamo sistemi di follow-up, 5 = Sistemi completi e ben gestiti"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sezione 5: Competitor & Posizionamento */}
              {currentSection === 5 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Inserisci almeno 2 competitor principali (nome azienda e sito web)
                    </Label>
                    {competitors.map((competitor, index) => (
                      <div key={index} className="space-y-3 p-4 border rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-sm">Competitor {index + 1}</span>
                          {competitors.length > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeCompetitor(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Rimuovi
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`competitor-name-${index}`}>Nome Azienda</Label>
                          <Input
                            id={`competitor-name-${index}`}
                            type="text"
                            value={competitor.nomeAzienda}
                            onChange={(e) => updateCompetitor(index, "nomeAzienda", e.target.value)}
                            placeholder="Es: Azienda Competitor SRL"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`competitor-website-${index}`}>Sito Web</Label>
                          {/* Added prefix "https://www.": */}
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-600 text-sm">
                              https://www.
                            </span>
                            <Input
                              id={`competitor-website-${index}`}
                              type="text"
                              value={competitor.sitoWeb}
                              onChange={(e) => updateCompetitor(index, "sitoWeb", e.target.value)}
                              placeholder="esempio.com"
                              required
                              className="rounded-l-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addCompetitor} className="w-full bg-transparent">
                      + Aggiungi Competitor
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Avete individuato i principali competitori nel vostro settore?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = No</span>
                        <span className="font-medium">Valore: {formData.individuazioneCompetitor}</span>
                        <span>{"5 = Sì"}</span>
                      </div>
                      <Slider
                        value={[formData.individuazioneCompetitor]}
                        onValueChange={(value) => updateFormData("individuazioneCompetitor", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        {
                          "1 = Non abbiamo individuato competitori, 5 = Siamo ben consapevoli dei principali competitori"
                        }
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Quanto è chiaro il vostro valore proposto rispetto ai competitori?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Non lo sappiamo</span>
                        <span className="font-medium">Valore: {formData.propostoValore}</span>
                        <span>{"5 = Molto chiaro"}</span>
                      </div>
                      <Slider
                        value={[formData.propostoValore]}
                        onValueChange={(value) => updateFormData("propostoValore", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        {
                          "1 = Non sappiamo cosa differenzia il nostro valore, 5 = Il nostro valore è molto chiaro e distintivo"
                        }
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Quanto è visibile la vostra azienda online rispetto ai competitori?
                    </Label>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600 px-1">
                        <span>1 = Non visibile</span>
                        <span className="font-medium">Valore: {formData.visibilitaOnline}</span>
                        <span>{"5 = Molto visibile"}</span>
                      </div>
                      <Slider
                        value={[formData.visibilitaOnline]}
                        onValueChange={(value) => updateFormData("visibilitaOnline", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                      <p className="text-sm text-gray-500 italic">
                        {"1 = Non ci troviamo online, 5 = Siamo molto visibili online"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sezione 6: KPI Sintetici */}
              {currentSection === 6 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="tempoMedioRisposta" className="text-base font-semibold">
                      Tempo medio risposta (in ore) 
                    </Label>
                    <Input
                      id="tempoMedioRisposta"
                      value={formData.tempoMedioRisposta}
                      onChange={(e) => updateFormData("tempoMedioRisposta", e.target.value)}
                      placeholder="Es: 2 ore, 1 giorno, ecc."
                      required
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="percentualeFollowUp" className="text-base font-semibold">
                      % follow-up attivi (in percentuale)
                    </Label>
                    <Input
                      id="percentualeFollowUp"
                      value={formData.percentualeFollowUp}
                      onChange={(e) => updateFormData("percentualeFollowUp", e.target.value)}
                      placeholder="Es: 50%, 75%, ecc."
                      required
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leadMensili" className="text-base font-semibold">
                      Lead mensili stimati (a numero)
                    </Label>
                    <Input
                      id="leadMensili"
                      value={formData.leadMensili}
                      onChange={(e) => updateFormData("leadMensili", e.target.value)}
                      placeholder="Es: 20, 50, 100, ecc."
                      required
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tassoChiusura" className="text-base font-semibold">
                      Tasso chiusura preventivi (in percentuale)
                    </Label>
                    <Input
                      id="tassoChiusura"
                      value={formData.tassoChiusura}
                      onChange={(e) => updateFormData("tassoChiusura", e.target.value)}
                      placeholder="Es: 30%, 45%, ecc."
                      required
                      className="text-base"
                    />
                  </div>
                </div>
              )}

              {/* Sezione 7: Obiettivi (ex sezione 6) */}
              {currentSection === 7 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      Quanto è chiaro l'obiettivo di crescita digitale che vuoi raggiungere?
                    </Label>
                    <div className="space-y-2">
                      <Slider
                        value={[formData.chiarezzaObiettivo]}
                        onValueChange={(value) => updateFormData("chiarezzaObiettivo", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>1 - Per niente</span>
                        <span>5 - Chiarissimo</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      Quanto ritieni realistico raggiungere questo obiettivo nei prossimi 6-12 mesi?
                    </Label>
                    <div className="space-y-2">
                      <Slider
                        value={[formData.realismoObiettivo]}
                        onValueChange={(value) => updateFormData("realismoObiettivo", value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>1 - Poco realistico</span>
                        <span>5 - Molto realistico</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sezione 8: Conferma (ex sezione 7) */}
              {currentSection === 8 && (
                <div className="space-y-8 py-8">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Sei pronto per inviare la tua Analisi Lampo!</h3>
                    <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                      Hai completato tutte le sezioni del questionario. Clicca sul bottone qui sotto per confermare e
                      inviare i tuoi dati.
                    </p>
                    <p className="text-base text-gray-600 max-w-2xl mx-auto">
                      Riceverai entro 3 giorni un report completo di 10 pagine con analisi dettagliata, grafici e 3
                      azioni pratiche immediate per la tua azienda.
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
              )}
            </CardContent>
          </Card>
        </form>

        {currentSection < 8 && ( // Aggiornato da 7 a 8
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

        {currentSection === 8 && ( // Aggiornato da 7 a 8
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
