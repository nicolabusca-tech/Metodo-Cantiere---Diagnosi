'use client'

import { useMemo, useEffect, useRef } from 'react'
import { contentToSafeHtml } from '@/lib/diagnosi-sanitize'
import { applyDiagnosiTransforms, applyLampoTransforms } from '@/lib/diagnosi-transforms'

interface DiagnosiViewerProps {
  content: string
  className?: string
}

export function DiagnosiViewer({ content, className = '' }: DiagnosiViewerProps) {
  const safeHtml = useMemo(() => contentToSafeHtml(content), [content])

  const isDiagnosi = safeHtml.includes('diagnosi-document')
  const isLampo = safeHtml.includes('lampo-document')
  const isStructuredDocument = isDiagnosi || isLampo

  const containerRef = useRef<HTMLElement | null>(null)

  // Allinea il rendering a video con il PDF: applica le stesse trasformazioni
  // grafiche dopo che React ha montato l'HTML. Per la Diagnosi attiviamo le
  // trasformazioni dedicate (cover hero, volume opener, donut chart, ecc.),
  // per il Lampo quelle dedicate (cover hero L, area card, score banner,
  // action callout, badge SVG semaforo).
  useEffect(() => {
    if (!isStructuredDocument) return
    const el = containerRef.current
    if (!el) return
    if (isLampo) {
      applyLampoTransforms(el)
    } else {
      applyDiagnosiTransforms(el, { removeOldFooter: true })
    }
  }, [isStructuredDocument, isLampo, safeHtml])

  if (isStructuredDocument) {
    return (
      <article
        ref={(el) => { containerRef.current = el }}
        className={className}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    )
  }

  return (
    <article
      className={`prose prose-neutral max-w-none
        prose-headings:text-neutral-900 prose-headings:font-bold
        prose-h1:text-3xl prose-h1:border-b prose-h1:border-neutral-200 prose-h1:pb-3 prose-h1:mb-6
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-neutral-700 prose-p:leading-relaxed
        prose-li:text-neutral-700
        prose-strong:text-neutral-900
        prose-blockquote:border-primary prose-blockquote:bg-neutral-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
        prose-table:border-collapse
        prose-th:bg-neutral-100 prose-th:text-left prose-th:px-4 prose-th:py-2 prose-th:border prose-th:border-neutral-200
        prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-neutral-200
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        ${className}`}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
