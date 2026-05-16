'use client'

import { useRef, useState } from 'react'
import { DiagnosiViewer } from '@/components/diagnosi-viewer'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'

interface DiagnosiWithDownloadProps {
  title: string
  createdAt: string
  content: string
  tipo: string
  reviewToken?: string
}

export function DiagnosiWithDownload({
  title,
  createdAt,
  content,
  tipo,
  reviewToken,
}: DiagnosiWithDownloadProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleDownloadPdf = async () => {
    if (!reviewToken) {
      console.error('Token mancante per esportazione PDF')
      return
    }
    setIsExporting(true)
    try {
      const res = await fetch(`/api/diagnosi-pdf?token=${encodeURIComponent(reviewToken)}`)
      if (!res.ok) {
        throw new Error(`Errore server: ${res.status}`)
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `analisi-${tipo}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Errore durante l\'esportazione PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-8 md:p-12 relative print:shadow-none print:border-0 print:rounded-none print:p-0">
      <Button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isExporting}
        variant="outline"
        className="absolute top-6 right-6 sm:top-8 sm:right-12 print:hidden"
      >
        <FileDown className="w-4 h-4" />
        {isExporting ? 'Generazione...' : 'Scarica PDF'}
      </Button>

      <div ref={contentRef} className="pdf-content">
        <div className="flex justify-center mb-6">
          <img src="/images/1.png" alt="Metodo Cantiere" className="h-16 w-auto" />
        </div>
        <div className="mb-8 pb-6 border-b border-neutral-200 pr-32 print:pr-0">
          <h1 className="text-3xl font-bold text-neutral-900">
            {title} Metodo Cantiere
          </h1>
          <p className="text-sm text-neutral-500 mt-2">{createdAt}</p>
        </div>
        <DiagnosiViewer content={content} />
      </div>
    </div>
  )
}
