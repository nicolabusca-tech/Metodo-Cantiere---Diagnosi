import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'

/** HTML fragment / document: trim-start then `<` + letter, `?`, or `!` (DOCTYPE, comments). */
export function isLikelyHtmlFragment(s: string): boolean {
  const t = s.trimStart()
  if (!t) return false
  return /^<[a-z?!]/i.test(t)
}

export function sanitizeDiagnosiHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['section', 'footer'],
    ADD_ATTR: ['target', 'rel', 'class'],
  }) as string
}

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true }) as string
}

/** Display: legacy Markdown → HTML, HTML → sanitized HTML. */
export function contentToSafeHtml(content: string): string {
  const raw = content.trim()
  if (!raw) return ''
  const html = isLikelyHtmlFragment(content) ? content : markdownToHtml(content)
  return sanitizeDiagnosiHtml(html)
}

/** Persist: sanitize HTML; leave non-HTML (e.g. old Markdown) unchanged. */
export function normalizeDiagnosiForStorage(input: string): string {
  if (!input.trim()) return ''
  if (!isLikelyHtmlFragment(input)) return input
  return sanitizeDiagnosiHtml(input)
}

export type DiagnosiDisplayRow = {
  tipo: 'analisi_lampo' | 'diagnosi_strategica'
  diagnosi: string
  volume_1?: string
  volume_2?: string
  volume_3?: string
}

/**
 * Single stream for DiagnosiViewer / PDF: analisi_lampo uses `diagnosi`;
 * diagnosi_strategica joins volume_1..3 with a light seam, or falls back to legacy `diagnosi`.
 */
export function displayDiagnosiContent(row: DiagnosiDisplayRow): string {
  if (row.tipo === 'analisi_lampo') {
    return row.diagnosi ?? ''
  }

  const vols = [row.volume_1 ?? '', row.volume_2 ?? '', row.volume_3 ?? '']

  const blocks: string[] = []
  for (let i = 0; i < 3; i++) {
    const t = vols[i].trim()
    if (!t) continue
    blocks.push(
      `<div class="diagnosi-volume diagnosi-volume--${i + 1}" data-volume="${i + 1}">${t}</div>`
    )
  }

  if (blocks.length > 0) {
    const seam = '<div class="diagnosi-volume-seam" aria-hidden="true"></div>'
    const inner = blocks.join(seam)
    return `<div class="diagnosi-document diagnosi-strategica-unified">${inner}</div>`
  }

  return (row.diagnosi ?? '').trim()
}
