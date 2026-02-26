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
}

export function DiagnosiWithDownload({
  title,
  createdAt,
  content,
  tipo,
}: DiagnosiWithDownloadProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return
    setIsExporting(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const filename = `analisi-${tipo}-${new Date().toISOString().slice(0, 10)}.pdf`
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

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-8 md:p-12 relative">
      <Button
        onClick={handleDownloadPdf}
        disabled={isExporting}
        variant="outline"
        className="absolute top-6 right-6 sm:top-8 sm:right-12"
      >
        <FileDown className="w-4 h-4" />
        {isExporting ? 'Generazione...' : 'Scarica PDF'}
      </Button>

      <div ref={contentRef} className="pdf-content">
        <div className="mb-8 pb-6 border-b border-neutral-200 pr-32">
          <h1 className="text-3xl font-bold text-neutral-900">
            {title} Metodo Cantiere®
          </h1>
          <p className="text-sm text-neutral-500 mt-2">{createdAt}</p>
        </div>
        <DiagnosiViewer content={content} />
      </div>
    </div>
  )
}
