import { marked } from 'marked'

/** HTML fragment / document: trim-start then `<` + letter, `?`, or `!` (DOCTYPE, comments). */
export function isLikelyHtmlFragment(s: string): boolean {
  const t = s.trimStart()
  if (!t) return false
  return /^<[a-z?!]/i.test(t)
}

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true }) as string
}

/**
 * Persist: store input as-is (sanitization happens at display time via contentToSafeHtml).
 * Only trims empty strings.
 */
export function normalizeDiagnosiForStorage(input: string): string {
  if (!input.trim()) return ''
  return input
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
    const md = (row.diagnosi ?? '').trim()
    if (!md) return ''
    // Lampo arriva in markdown puro: converti qui e wrappa in lampo-document
    // cosi' viewer e route PDF possono applicare le trasformazioni editoriali
    // dedicate (cover hero, area card, score banner, action callout).
    const html = isLikelyHtmlFragment(md) ? md : markdownToHtml(md)
    return `<div class="lampo-document">${html}</div>`
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
