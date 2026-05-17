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
    if (t.nodeValue && /[®\u{2580}-\u{259F}]/u.test(t.nodeValue)) {
      toFix.push(t)
    }
  }
  toFix.forEach((t) => {
    if (t.nodeValue) {
      t.nodeValue = t.nodeValue.replace(/®/g, '').replace(/[\u{2580}-\u{259F}]/gu, '')
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

/**
 * Trasformazioni grafiche per l'Analisi Lampo.
 *
 * L'Analisi Lampo arriva da n8n in markdown puro, viene convertita in HTML
 * da marked, e poi wrappata in <div class="lampo-document">. Qui sopra
 * applichiamo il livello editoriale: cover hero, score banner, card delle
 * sei aree con badge SVG semaforo, callout "Azione diretta", scorecard
 * table. Stessa scuola della Diagnosi, formato pi&ugrave; compatto.
 *
 * Auto-contenuta e idempotente per gli stessi motivi di applyDiagnosiTransforms.
 */
export function applyLampoTransforms(scope: Document | HTMLElement): void {
  if (!scope) return
  const root: Element | Document = (scope as Document).body ? (scope as Document) : (scope as HTMLElement)
  const container: ParentNode = (root as Document).body ? (root as Document).body : (root as HTMLElement)
  if (!container) return

  const markerHost = (container as HTMLElement).setAttribute ? (container as HTMLElement) : null
  if (markerHost && markerHost.getAttribute('data-lampo-transformed') === '1') return

  const ownerDoc: Document =
    (root as Document).body
      ? (root as Document)
      : (root as Element).ownerDocument || document

  const lampoDoc = container.querySelector('.lampo-document') as HTMLElement | null
  if (!lampoDoc) return

  // SVG per i badge semaforo: cerchio pieno con bordo, dimensioni controllate
  // (le emoji native in Puppeteer/Chromium escono male e con baseline ballerina).
  const statusSvg = (color: string): string =>
    '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">' +
      '<circle cx="10" cy="10" r="7.5" fill="' + color + '" stroke="#1a1a1a" stroke-opacity="0.18" stroke-width="0.8" />' +
    '</svg>'

  const STATUS_COLORS: Record<string, string> = {
    red: '#d63b3b',
    yellow: '#e69100',
    orange: '#e69100',
    green: '#2f9d4a',
  }

  const detectStatus = (txt: string): 'red' | 'yellow' | 'green' | null => {
    if (txt.indexOf('🔴') >= 0) return 'red'
    if (txt.indexOf('🟠') >= 0 || txt.indexOf('🟡') >= 0) return 'yellow'
    if (txt.indexOf('🟢') >= 0) return 'green'
    return null
  }

  const stripStatusEmoji = (txt: string): string =>
    txt.replace(/[\u{1F534}\u{1F7E0}\u{1F7E1}\u{1F7E2}]/gu, '').trim()

  // 1. Cover hero
  // Pattern markdown: H1 "ANALISI LAMPO..." + H2 nome azienda + paragrafo
  // con "Preparato da" + "Data" + "Documento riservato" + <hr> + paragrafo
  // italic motto + <hr>. Lo identifico cercando il primo h1 del documento.
  const firstH1 = lampoDoc.querySelector('h1') as HTMLHeadingElement | null
  if (firstH1 && !firstH1.dataset.lampoHero) {
    const titleTxt = (firstH1.textContent || 'Analisi Lampo').replace(/®|®/g, '').trim()
    // Cerco h2 successivo per nome azienda
    let azienda = ''
    let metaPara: HTMLElement | null = null
    let mottoPara: HTMLElement | null = null
    let cursor: Element | null = firstH1.nextElementSibling
    const toRemove: Element[] = []
    let mottoFound = false
    while (cursor) {
      const tag = cursor.tagName
      const txt = (cursor.textContent || '').trim()
      if (tag === 'H2' && !azienda) {
        azienda = txt
        toRemove.push(cursor)
        cursor = cursor.nextElementSibling
        continue
      }
      if (tag === 'P' && !metaPara && /preparato da|documento riservato|data\s*:/i.test(txt)) {
        metaPara = cursor as HTMLElement
        toRemove.push(cursor)
        cursor = cursor.nextElementSibling
        continue
      }
      if (tag === 'HR') {
        toRemove.push(cursor)
        cursor = cursor.nextElementSibling
        continue
      }
      if (tag === 'P' && !mottoFound) {
        // Il motto e' un paragrafo italic centrato
        if (cursor.querySelector('em') || /^["“].*["”]$/.test(txt)) {
          mottoPara = cursor as HTMLElement
          toRemove.push(cursor)
          mottoFound = true
          cursor = cursor.nextElementSibling
          continue
        }
      }
      break
    }

    // Estraggo meta: "Preparato da: X" + "Data: Y" possono essere su righe
    // separate dentro lo stesso <p>.
    let redatto = 'Nicola Busca — Metodo Cantiere'
    let dataTxt = ''
    if (metaPara) {
      const m1 = (metaPara.textContent || '').match(/preparato da\s*:\s*([^\n]+?)(?:\s*\n|$|data)/i)
      if (m1) redatto = m1[1].trim().replace(/®|®/g, '').trim()
      const m2 = (metaPara.textContent || '').match(/data\s*:\s*([^\n]+?)(?:\s*\n|$|documento)/i)
      if (m2) dataTxt = m2[1].trim()
    }

    const mottoTxt = mottoPara
      ? (mottoPara.textContent || '').replace(/^["“]|["”]$/g, '').trim()
      : 'Dal contatto al contratto, passo passo.'

    const kicker = 'Analisi Lampo' + (dataTxt ? ' · ' + dataTxt : '')

    const hero = ownerDoc.createElement('div')
    hero.className = 'lampo-cover-hero'
    hero.dataset.lampoHero = '1'
    hero.innerHTML =
      '<div class="lch-top">' +
        '<div class="lch-brand">Metodo Cantiere</div>' +
        '<div class="lch-kicker">' + kicker + '</div>' +
      '</div>' +
      '<div class="lch-watermark" aria-hidden="true">L</div>' +
      '<div class="lch-center">' +
        '<h1 class="lch-title">Analisi Lampo</h1>' +
        '<p class="lch-subtitle">La radiografia rapida della tua impresa</p>' +
        '<hr class="lch-rule" />' +
      '</div>' +
      '<div class="lch-dedicato">' +
        '<div class="lch-dedicato-label">Dedicato a</div>' +
        '<div class="lch-dedicato-name">' + (azienda || titleTxt) + '</div>' +
      '</div>' +
      '<div class="lch-footer">' +
        '<div class="lch-footer-left">' +
          '<div class="lch-footer-meta">Redatto da</div>' +
          '<div class="lch-footer-author">' + redatto + '</div>' +
        '</div>' +
        '<div class="lch-motto">' + '“' + mottoTxt + '”' + '</div>' +
      '</div>'

    firstH1.parentNode?.insertBefore(hero, firstH1)
    firstH1.remove()
    toRemove.forEach((el) => el.remove())
  }

  // 2. Strip ® e residui ASCII art dai text nodes (idem Diagnosi)
  const walker = ownerDoc.createTreeWalker(lampoDoc as Node, NodeFilter.SHOW_TEXT)
  const toFix: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) {
    const t = n as Text
    if (
      t.nodeValue &&
      /[®\u{2580}-\u{259F}\u{2190}-\u{21FF}\u{27F0}-\u{27FF}\u{2900}-\u{297F}]/u.test(t.nodeValue)
    ) toFix.push(t)
  }
  toFix.forEach((t) => {
    if (!t.nodeValue) return
    t.nodeValue = t.nodeValue
      .replace(/®/g, '')
      .replace(/[\u{2580}-\u{259F}]/gu, '')
      // Frecce: font Source Serif 4 / Inter non hanno glyph per U+2190+,
      // Chromium fallback mostra un rettangolo che assomiglia a |. Sostituisco
      // con > ASCII che renderizza ovunque. Non bellissimo ma robusto.
      .replace(/[\u{2190}-\u{21FF}\u{27F0}-\u{27FF}\u{2900}-\u{297F}]/gu, '>')
  })

  // 3. Score banner: H2 "Il tuo livello commerciale" + H1 successivo dentro corpo
  //    Quel pattern markdown e' anomalo (H1 in mezzo al body) ma e' come arriva.
  Array.from(lampoDoc.querySelectorAll('h2')).forEach((h2) => {
    const el = h2 as HTMLHeadingElement
    if (el.dataset.lampoBanner) return
    const txt = (el.textContent || '').toLowerCase()
    if (!/livello\s+commerciale|tuo\s+livello/.test(txt)) return
    const next = el.nextElementSibling
    if (!next || next.tagName !== 'H1') return
    const scoreTxt = (next.textContent || '').trim()
    const status = detectStatus(scoreTxt) || 'red'
    const clean = stripStatusEmoji(scoreTxt)
    // Cerco il primo paragrafo successivo come descrizione
    let desc: HTMLElement | null = null
    let after: Element | null = next.nextElementSibling
    while (after) {
      if (after.tagName === 'P') { desc = after as HTMLElement; break }
      if (after.tagName === 'H1' || after.tagName === 'H2' || after.tagName === 'H3') break
      after = after.nextElementSibling
    }
    const banner = ownerDoc.createElement('section')
    banner.className = 'lampo-score-banner lampo-score-banner--' + status
    banner.dataset.lampoBanner = '1'
    banner.innerHTML =
      '<div class="lsb-kicker">' + (el.textContent || '').trim() + '</div>' +
      '<div class="lsb-row">' +
        '<div class="lsb-icon">' + statusSvg(STATUS_COLORS[status]) + '</div>' +
        '<div class="lsb-headline">' + clean + '</div>' +
      '</div>' +
      (desc ? '<div class="lsb-desc">' + desc.innerHTML + '</div>' : '')
    el.parentNode?.insertBefore(banner, el)
    el.remove()
    next.remove()
    if (desc && desc.parentNode) desc.remove()
  })

  // 4. Info callout "Come leggere questo report": blockquote che contiene un h3
  //    con quel testo. Wrap in classe dedicata.
  Array.from(lampoDoc.querySelectorAll('blockquote')).forEach((bq) => {
    const el = bq as HTMLElement
    if (el.dataset.lampoInfo) return
    const h3 = el.querySelector('h3')
    if (!h3) return
    if (!/come\s+leggere/i.test(h3.textContent || '')) return
    el.classList.add('lampo-info-callout')
    el.dataset.lampoInfo = '1'
  })

  // 5. Action callout: blockquote che inizia con 💡 e contiene "Azione diretta"
  Array.from(lampoDoc.querySelectorAll('blockquote')).forEach((bq) => {
    const el = bq as HTMLElement
    if (el.dataset.lampoAction) return
    const txt = (el.textContent || '').trim()
    if (!/azione\s+diretta/i.test(txt)) return
    el.classList.add('lampo-action-callout')
    el.dataset.lampoAction = '1'
    // Rimuovo l'emoji 💡 dal testo, la mettiamo via CSS come icona dedicata
    const w = ownerDoc.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let tn: Node | null
    const fixes: Text[] = []
    while ((tn = w.nextNode())) {
      const t = tn as Text
      if (t.nodeValue && t.nodeValue.indexOf('💡') >= 0) fixes.push(t)
    }
    fixes.forEach((t) => { if (t.nodeValue) t.nodeValue = t.nodeValue.replace(/💡\s*/g, '') })
  })

  // 6. Scorecard table: tabelle 3 col con header "Voce | Situazione | Standard"
  Array.from(lampoDoc.querySelectorAll('table')).forEach((tbl) => {
    const headers = Array.from(tbl.querySelectorAll('thead th')).map(
      (th) => (th.textContent || '').trim().toLowerCase()
    )
    const isScore = headers.length === 3 && headers[0].indexOf('voce') >= 0
    if (isScore) (tbl as HTMLElement).classList.add('lampo-scorecard-table')
    // Tabelle corte non si spezzano
    if (tbl.querySelectorAll('tr').length <= 7) {
      ;(tbl as HTMLElement).style.breakInside = 'avoid'
      ;(tbl as HTMLElement).style.pageBreakInside = 'avoid'
    }
  })

  // 7. Area card: ogni h3 che inizia con emoji semaforo + lettera. + nome area
  //    diventa l'apertura di una <section class="lampo-area-card"> che ingloba
  //    tutto fino al prossimo h3/h2 o fine documento.
  const areaH3s = Array.from(lampoDoc.querySelectorAll('h3')).filter((h3) => {
    const t = (h3.textContent || '').trim()
    return /^[\u{1F534}\u{1F7E0}\u{1F7E1}\u{1F7E2}]\s*[A-Z]\.\s/u.test(t)
  })
  areaH3s.forEach((h3) => {
    const el = h3 as HTMLHeadingElement
    if (el.dataset.lampoArea) return
    const status = detectStatus(el.textContent || '') || 'yellow'
    const clean = stripStatusEmoji(el.textContent || '')
    // Estraggo lettera area e titolo
    const m = clean.match(/^([A-Z])\.\s*(.+?)(?:\s*—\s*(.+))?$/)
    const lettera = m ? m[1] : ''
    const nome = m ? m[2].trim() : clean
    const sottotitolo = m && m[3] ? m[3].trim() : ''

    const card = ownerDoc.createElement('section')
    card.className = 'lampo-area-card lampo-area-card--' + status
    card.dataset.lampoArea = '1'
    const headerEl = ownerDoc.createElement('header')
    headerEl.className = 'lac-header'
    headerEl.innerHTML =
      '<div class="lac-badge">' +
        '<span class="lac-letter">' + lettera + '</span>' +
        '<span class="lac-status">' + statusSvg(STATUS_COLORS[status]) + '</span>' +
      '</div>' +
      '<div class="lac-title-wrap">' +
        '<h3 class="lac-title">' + nome + '</h3>' +
        (sottotitolo ? '<p class="lac-subtitle">' + sottotitolo + '</p>' : '') +
      '</div>'

    // Inserisco la card al posto dell'h3, poi sposto dentro tutti i sibling
    // fino al prossimo h3 o h2 o <hr>.
    el.parentNode?.insertBefore(card, el)
    card.appendChild(headerEl)
    const body = ownerDoc.createElement('div')
    body.className = 'lac-body'
    card.appendChild(body)

    let cursor: Element | null = el
    const toMove: Element[] = []
    toMove.push(el)
    let nxt = el.nextElementSibling
    while (nxt) {
      const tag = nxt.tagName
      if (tag === 'H3' || tag === 'H2') break
      if (tag === 'HR') { toMove.push(nxt); break }
      toMove.push(nxt)
      nxt = nxt.nextElementSibling
    }
    // L'h3 originale lo butto, ho gia' il titolo nell'header card
    el.remove()
    toMove.shift()
    toMove.forEach((node) => {
      if (node.tagName === 'HR') { node.remove(); return }
      body.appendChild(node)
    })
  })

  // 8. CTA finale: "I tuoi 147€ non sono un costo. Sono un acconto."
  //    Nel markdown e' h2 con emoji 🎁 davanti; la cerco su h2 e h3.
  Array.from(lampoDoc.querySelectorAll('h2, h3')).forEach((h) => {
    const el = h as HTMLHeadingElement
    if (el.dataset.lampoCta || el.dataset.lampoBanner) return
    const rawTxt = (el.textContent || '').trim()
    if (!/i\s+tuoi\s+\d+\s*[€E]\s+non/i.test(rawTxt)) return
    el.dataset.lampoCta = '1'
    // Pulisce l'emoji 🎁 iniziale + altri emoji decorativi
    const claim = rawTxt.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]+\s*/gu, '').trim()
    // Cerco il paragrafo seguente come nota
    let note: HTMLElement | null = null
    let nxt = el.nextElementSibling
    while (nxt) {
      if (nxt.tagName === 'P') { note = nxt as HTMLElement; break }
      if (nxt.tagName === 'H2' || nxt.tagName === 'H3' || nxt.tagName === 'HR') break
      nxt = nxt.nextElementSibling
    }
    const cta = ownerDoc.createElement('section')
    cta.className = 'lampo-final-cta'
    cta.innerHTML =
      '<div class="lfc-kicker">Vuoi andare oltre la fotografia</div>' +
      '<div class="lfc-claim">' + claim + '</div>' +
      (note ? '<div class="lfc-note">' + note.innerHTML + '</div>' : '')
    el.parentNode?.insertBefore(cta, el)
    el.remove()
    if (note) note.remove()
  })

  // 9. "Il passo successivo" + bullet "[Prenota..." finale come CTA-conclude
  Array.from(lampoDoc.querySelectorAll('h3, p > strong')).forEach((node) => {
    const el = node as HTMLElement
    if (el.dataset.lampoNext) return
    const txt = (el.textContent || '').trim()
    if (!/^il\s+passo\s+successivo$/i.test(txt)) return
    // Trovo il blocco contenitore (h3 stesso o suo parent p)
    const anchor = el.tagName === 'H3' ? el : (el.parentElement as HTMLElement | null)
    if (!anchor) return
    anchor.dataset.lampoNext = '1'
    // Raccolgo tutto fino a hr o fine
    const collected: Element[] = []
    let nxt = anchor.nextElementSibling
    while (nxt) {
      if (nxt.tagName === 'HR' || nxt.tagName === 'H2' || nxt.tagName === 'H3') break
      collected.push(nxt)
      nxt = nxt.nextElementSibling
    }
    if (collected.length === 0) return
    const box = ownerDoc.createElement('section')
    box.className = 'lampo-next-step'
    let html = '<div class="lns-label">Il passo successivo</div><div class="lns-content">'
    collected.forEach((c) => { html += c.outerHTML })
    html += '</div>'
    box.innerHTML = html
    anchor.parentNode?.insertBefore(box, anchor)
    anchor.remove()
    collected.forEach((c) => c.remove())
  })

  // 10. Tabelle non-scorecard: se ha header e non e' una scorecard a 3 col,
  //     applica una classe per stile compatto con prima colonna in evidenza.
  Array.from(lampoDoc.querySelectorAll('table')).forEach((tbl) => {
    if ((tbl as HTMLElement).classList.contains('lampo-scorecard-table')) return
    const headers = tbl.querySelectorAll('thead th').length
    if (headers >= 3) (tbl as HTMLElement).classList.add('lampo-compare-table')
  })

  // 11. Mark wrapper come trasformato
  if (markerHost) markerHost.setAttribute('data-lampo-transformed', '1')
}
