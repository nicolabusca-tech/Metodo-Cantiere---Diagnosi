/**
 * Trasformazioni grafiche editoriali applicate al rendering della Diagnosi.
 *
 * Una sola funzione, due chiamanti:
 *   1) l'endpoint server-side che genera il PDF (via puppeteer page.evaluate)
 *   2) il client che mostra il documento a video al cliente / admin
 *
 * Il risultato visivo deve essere lo stesso in entrambi i contesti.
 *
 * IMPORTANTE: la funzione e' auto-contenuta. Tutte le costanti sono dichiarate
 * nel body perche' Puppeteer serializza la funzione via .toString() e non
 * porta con se' eventuali variabili module-scope.
 *
 * Idempotente: puo' essere chiamata piu' volte sullo stesso DOM senza effetti
 * collaterali (usa marker data-diagnosi-transformed).
 */

export type DiagnosiTransformOptions = {
  /**
   * Quando true, rimuove il <footer class="diagnosi-footer"> hardcoded del
   * template (perche' nel PDF la numerazione la mette Chromium nativo).
   * A video lasciamo il footer template come decorazione.
   */
  removeOldFooter?: boolean
}

export function applyDiagnosiTransforms(
  scope: Document | HTMLElement,
  options: DiagnosiTransformOptions = {}
): void {
  if (!scope) return
  const root: Element | Document = (scope as Document).body ? scope as Document : scope as HTMLElement
  const container: ParentNode = (root as Document).body ? (root as Document).body : (root as HTMLElement)
  if (!container) return

  // Marker idempotenza
  const markerHost = (container as HTMLElement).setAttribute ? (container as HTMLElement) : null
  if (markerHost && markerHost.getAttribute('data-diagnosi-transformed') === '1') return

  const ownerDoc: Document =
    (root as Document).body
      ? (root as Document)
      : (root as Element).ownerDocument || document

  // Costanti inline (devono restare dentro la funzione per Puppeteer)
  const VOLUME_OPENER_INFO: Record<string, { num: string; title: string; subtitle: string }> = {
    '2': { num: 'II', title: 'La Diagnosi', subtitle: 'Dove si perdono i contratti' },
    '3': { num: 'III', title: 'Il Percorso', subtitle: "Piano d'azione in 90 giorni" },
  }
  const VOLUME_RUNNING_TITLES: Record<string, string> = {
    '1': 'Volume I — La Fotografia',
    '2': 'Volume II — La Diagnosi',
    '3': 'Volume III — Il Percorso',
  }

  // 0. Cover hero per Volume I: sostituisce la diagnosi-cover originale del
  //    primo volume con una versione editoriale d'impatto. Estrae azienda,
  //    settore, area, data, redatto da dalla cover meta originale.
  const vol1 = container.querySelector('[data-volume="1"]') as HTMLElement | null
  const cov = vol1
    ? (vol1.querySelector('.diagnosi-cover') as HTMLElement | null)
    : (container.querySelector('.diagnosi-cover') as HTMLElement | null)
  if (cov && !cov.dataset.heroApplied) {
    const meta: Record<string, string> = {}
    cov.querySelectorAll('.cover-meta-row').forEach((row) => {
      const labelEl = row.querySelector('.cover-meta-label')
      const labelTxt = ((labelEl?.textContent || '').replace(':', '').trim().toLowerCase())
      const rawTxt = (row.textContent || '').trim()
      const valueTxt = labelEl
        ? rawTxt.replace(labelEl.textContent || '', '').replace(/^:?\s*/, '').trim()
        : rawTxt
      if (labelTxt && valueTxt) meta[labelTxt] = valueTxt
    })
    const titleTxt = (cov.querySelector('.cover-title')?.textContent || 'La Fotografia').trim()
    const subtitleTxt = (cov.querySelector('.cover-subtitle')?.textContent || '').trim()
    const azienda = meta['azienda'] || ''
    const settore = meta['settore'] || ''
    const area = meta['area'] || ''
    const data = meta['data'] || ''
    const redatto = meta['redatto da'] || 'Nicola Busca — Metodo Cantiere'
    const kicker =
      'Diagnosi Strategica · Volume I di III' + (data ? ' · ' + data : '')
    const hero = ownerDoc.createElement('div')
    hero.className = 'diagnosi-cover-hero'
    hero.dataset.heroApplied = '1'
    hero.innerHTML =
      '<div class="ch-top">' +
        '<div class="ch-brand">Metodo Cantiere</div>' +
        '<div class="ch-kicker">' + kicker + '</div>' +
      '</div>' +
      '<div class="ch-center">' +
        '<h1 class="ch-title">' + titleTxt + '</h1>' +
        (subtitleTxt ? '<p class="ch-subtitle">' + subtitleTxt + '</p>' : '') +
        '<hr class="ch-rule" />' +
      '</div>' +
      '<div class="ch-dedicato">' +
        '<div class="ch-dedicato-label">Dedicato a</div>' +
        '<div class="ch-dedicato-name">' + (azienda || '—') + '</div>' +
        (settore || area
          ? '<div class="ch-dedicato-sub">' +
              [settore, area].filter(Boolean).join(' · ') +
            '</div>'
          : '') +
      '</div>' +
      '<div class="ch-footer">' +
        '<div class="ch-footer-left">' +
          '<div class="ch-footer-meta">Redatto da</div>' +
          '<div class="ch-footer-author">' + redatto + '</div>' +
        '</div>' +
        '<div class="ch-motto">' + '“Dal contatto al contratto, passo passo.”' + '</div>' +
      '</div>'
    cov.replaceWith(hero)

    // Dopo la cover hero del Vol I, rimuovi i diagnosi-page-break orfani
    // che restano nel template prima della lettera (causano la pagina 2
    // vuota con solo il filetto).
    let next = hero.nextElementSibling
    while (next && next.classList.contains('diagnosi-page-break')) {
      const toRemove = next
      next = next.nextElementSibling
      toRemove.remove()
    }
  }

  // 0b. Tabelle corte non si spezzano mai fra pagine.
  // Conto le righe (header + body): se <= 5 totali, applico break-inside:avoid.
  // Soglia bassa di proposito: tabelle medie/lunghe spezzano normalmente con
  // header ripetuto, evitando che blocchi mediamente grandi "saltino" alla
  // pagina successiva lasciando spazi vuoti.
  Array.from(container.querySelectorAll('table')).forEach((tbl) => {
    const rows = tbl.querySelectorAll('tr').length
    if (rows <= 5) {
      ;(tbl as HTMLElement).style.breakInside = 'avoid'
      ;(tbl as HTMLElement).style.pageBreakInside = 'avoid'
    }
  })

  // 1. Strip ® e blocchi unicode dai text nodes
  const walker = ownerDoc.createTreeWalker(container as Node, NodeFilter.SHOW_TEXT)
  const toFix: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) {
    const t = n as Text
    if (t.nodeValue && /[®█░■□▒▓]/u.test(t.nodeValue)) {
      toFix.push(t)
    }
  }
  toFix.forEach((t) => {
    if (t.nodeValue) {
      t.nodeValue = t.nodeValue.replace(/®/g, '').replace(/[█░■□▒▓]/gu, '')
    }
  })

  // 2. Widget grafico per "Peso nel punteggio globale: NN%"
  Array.from(container.querySelectorAll('p')).forEach((p) => {
    if (!/Peso nel punteggio globale:\s*\d+/i.test(p.textContent || '')) return
    if ((p as HTMLElement).dataset.transformed === 'pesowidget') return
    const m = (p.textContent || '').match(/Peso nel punteggio globale:\s*(\d+)/i)
    if (!m) return
    const pct = Math.max(0, Math.min(100, parseInt(m[1], 10)))
    const widget = ownerDoc.createElement('div')
    widget.className = 'area-weight-widget'
    widget.dataset.transformed = 'pesowidget'
    widget.innerHTML =
      '<div class="aww-label">Peso nel punteggio globale</div>' +
      '<div class="aww-track"><div class="aww-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="aww-value">' + pct + '<span class="aww-pct">%</span></div>'
    p.replaceWith(widget)
  })

  // 3 + 4. Cover/lettera/page-break orfani rimossi dai vol 2/3, inserito opener
  Object.keys(VOLUME_OPENER_INFO).forEach((volNum) => {
    const vol = container.querySelector('[data-volume="' + volNum + '"]') as HTMLElement | null
    if (!vol) return
    if (vol.dataset.openerApplied === '1') return
    const inner = (vol.querySelector('.diagnosi-document') as HTMLElement | null) || vol
    inner.querySelectorAll('.diagnosi-cover, .diagnosi-letter').forEach((el) => el.remove())
    let firstChild = inner.firstElementChild
    while (firstChild && firstChild.classList.contains('diagnosi-page-break')) {
      firstChild.remove()
      firstChild = inner.firstElementChild
    }
    const info = VOLUME_OPENER_INFO[volNum]
    const opener = ownerDoc.createElement('div')
    opener.className = 'volume-opener'
    opener.innerHTML =
      '<div class="vol-opener-kicker">Volume</div>' +
      '<div class="vol-opener-number">' + info.num + '</div>' +
      '<div class="vol-opener-rule"></div>' +
      '<h1 class="vol-opener-title">' + info.title + '</h1>' +
      '<p class="vol-opener-subtitle">' + info.subtitle + '</p>'
    vol.insertBefore(opener, vol.firstChild)
    vol.dataset.openerApplied = '1'
  })

  // 5. Footer template rimosso solo per PDF
  if (options.removeOldFooter) {
    container.querySelectorAll('.diagnosi-footer').forEach((el) => el.remove())
  }

  // 6. Running head contestuale per volume
  Object.keys(VOLUME_RUNNING_TITLES).forEach((volNum) => {
    const vol = container.querySelector('[data-volume="' + volNum + '"]') as HTMLElement | null
    if (!vol) return
    vol.querySelectorAll('.section-header-title').forEach((el) => {
      el.textContent = VOLUME_RUNNING_TITLES[volNum]
    })
  })

  // 7. VALORE POTENZIALE come callout XL
  Array.from(container.querySelectorAll('tr')).forEach((tr) => {
    const txt = tr.textContent || ''
    if (!/VALORE POTENZIALE/i.test(txt)) return
    const trEl = tr as HTMLTableRowElement
    if (trEl.dataset.transformed === 'vpcallout') return
    const cells = tr.querySelectorAll('td, th')
    if (cells.length < 2) return
    const labelCell = cells[0]
    const valueCell = cells[cells.length - 1]
    const labelTxt = (labelCell.textContent || '').replace(/VALORE POTENZIALE\s*[—\-]?\s*/i, '').trim()
    const valueTxt = (valueCell.textContent || '').trim()
    if (!valueTxt) return
    const box = ownerDoc.createElement('div')
    box.className = 'vp-callout'
    box.innerHTML =
      '<div class="vp-kicker">Valore potenziale annuo</div>' +
      '<div class="vp-amount">' + valueTxt + '</div>' +
      (labelTxt ? '<div class="vp-note">' + labelTxt + '</div>' : '')
    const table = tr.closest('table')
    if (table && table.parentNode) {
      table.parentNode.insertBefore(box, table.nextSibling)
    }
    trEl.dataset.transformed = 'vpcallout'
    tr.remove()
  })

  // 8. Pull-quote XL per .diagnosi-highlight con importi in euro
  Array.from(container.querySelectorAll('.diagnosi-highlight')).forEach((hl) => {
    const txt = hl.textContent || ''
    if (/(\d+\s*milion[ei]\s*di\s*euro|\d+\s*mila\s*euro\s+all|€\s*[\d.,]+)/i.test(txt)) {
      hl.classList.add('is-pullquote-xl')
    }
  })

  // 9. Donut chart per PUNTEGGIO GLOBALE
  Array.from(container.querySelectorAll('tr')).forEach((tr) => {
    const txt = tr.textContent || ''
    if (!/PUNTEGGIO GLOBALE/i.test(txt)) return
    const trEl = tr as HTMLTableRowElement
    if (trEl.dataset.transformed === 'donut') return
    const scoreMatch = txt.match(/(\d+)\s*\/\s*100/)
    if (!scoreMatch) return
    const score = Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10)))
    const profileMatch = txt.match(/PROFILO\s+[A-Z]/i)
    const profile = profileMatch ? profileMatch[0] : 'Punteggio globale'
    const levelMatch = txt.match(/[—–-]\s*([^—–\n]+?)\s*$/)
    const level = levelMatch ? levelMatch[1].trim() : ''
    const r = 42
    const circ = 2 * Math.PI * r
    const offset = circ * (1 - score / 100)
    let color = '#1A8A3A'
    if (score < 70) color = '#B87700'
    if (score < 50) color = '#B02E2E'
    const dashboard = ownerDoc.createElement('div')
    dashboard.className = 'global-score-dashboard'
    dashboard.innerHTML =
      '<div class="gsd-donut">' +
        '<svg viewBox="0 0 100 100" width="140" height="140" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="#e5e0d6" stroke-width="9"/>' +
          '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="9" stroke-linecap="round" ' +
            'stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '" ' +
            'transform="rotate(-90 50 50)"/>' +
          '<text x="50" y="54" text-anchor="middle" font-family="Source Serif 4, serif" ' +
            'font-size="26" font-weight="600" fill="#1a1a1a">' + score + '</text>' +
          '<text x="50" y="70" text-anchor="middle" font-family="Inter, sans-serif" ' +
            'font-size="6.5" letter-spacing="0.15em" fill="#888">SU 100</text>' +
        '</svg>' +
      '</div>' +
      '<div class="gsd-info">' +
        '<div class="gsd-kicker">Punteggio globale</div>' +
        '<div class="gsd-profile">' + profile + '</div>' +
        (level ? '<div class="gsd-level">' + level + '</div>' : '') +
      '</div>'
    const table = tr.closest('table')
    if (table && table.parentNode) {
      table.parentNode.insertBefore(dashboard, table)
    }
    trEl.dataset.transformed = 'donut'
    ;(tr as HTMLElement).style.display = 'none'
  })

  if (markerHost) {
    markerHost.setAttribute('data-diagnosi-transformed', '1')
  }
}
