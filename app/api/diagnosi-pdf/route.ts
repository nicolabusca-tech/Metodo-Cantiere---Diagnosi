import { NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'
export const maxDuration = 60

const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.x64.tar'

const LOCAL_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

async function resolveExecutablePath(): Promise<string> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return chromium.executablePath(CHROMIUM_PACK_URL)
  }
  const { existsSync } = await import('node:fs')
  for (const p of LOCAL_CHROME_PATHS) {
    if (existsSync(p)) return p
  }
  return chromium.executablePath(CHROMIUM_PACK_URL)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token || !/^[a-zA-Z0-9_-]+$/.test(token)) {
    return NextResponse.json({ error: 'Token mancante o non valido' }, { status: 400 })
  }

  const origin = url.origin
  const printUrl = `${origin}/review/${encodeURIComponent(token)}?print=1`

  const browser = await puppeteer.launch({
    args: process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? chromium.args
      : ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1240, height: 1754, deviceScaleFactor: 2 },
    executablePath: await resolveExecutablePath(),
    headless: true,
  })

  try {
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(45000)

    await page.goto(printUrl, { waitUntil: 'domcontentloaded' })

    // Aspetta che React monti il documento completo (tutti i volumi se strategica)
    await page.waitForFunction(
      () => {
        const doc = document.querySelector('.diagnosi-document')
        if (!doc) return false
        if (doc.classList.contains('diagnosi-strategica-unified')) {
          return doc.querySelectorAll('[data-volume]').length === 3
        }
        return doc.textContent && doc.textContent.length > 200
      },
      { timeout: 30000 }
    )

    // Aspetta fonts e network idle finale
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready
      }
    })
    await new Promise((r) => setTimeout(r, 500))

    // Trasformazioni grafiche editoriali in print-mode.
    // NOTA: il body della funzione e' duplicato qui per evitare che il
    // bundler Next.js compili helper TypeScript che Puppeteer non sa
    // serializzare. La logica e' la stessa di lib/diagnosi-transforms.ts
    // (usato lato client per allineare la view a video al PDF). Idempotente.
    await page.evaluate(() => {
      const scope = document.body
      if (!scope) return
      if (scope.getAttribute('data-diagnosi-transformed') === '1') return

      const VOLUME_OPENER_INFO: Record<string, { num: string; title: string; subtitle: string }> = {
        '2': { num: 'II', title: 'La Diagnosi', subtitle: 'Dove si perdono i contratti' },
        '3': { num: 'III', title: 'Il Percorso', subtitle: "Piano d'azione in 90 giorni" },
      }
      const VOLUME_RUNNING_TITLES: Record<string, string> = {
        '1': 'Volume I — La Fotografia',
        '2': 'Volume II — La Diagnosi',
        '3': 'Volume III — Il Percorso',
      }

      // 0. Cover hero per Volume I: sostituisce la cover originale con
      //    una versione editoriale d'impatto a tutta pagina.
      const vol1 = document.querySelector('[data-volume="1"]') as HTMLElement | null
      const cov = vol1
        ? (vol1.querySelector('.diagnosi-cover') as HTMLElement | null)
        : (document.querySelector('.diagnosi-cover') as HTMLElement | null)
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
        const kicker = 'Diagnosi Strategica · Volume I di III' + (data ? ' · ' + data : '')
        const hero = document.createElement('div')
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
              ? '<div class="ch-dedicato-sub">' + [settore, area].filter(Boolean).join(' · ') + '</div>'
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

        // Rimuovi page-break orfani dopo la cover hero (eliminano la pag 2 vuota)
        let next = hero.nextElementSibling
        while (next && next.classList.contains('diagnosi-page-break')) {
          const toRemove = next
          next = next.nextElementSibling
          toRemove.remove()
        }
      }

      // 0b. Tabelle corte (<= 8 righe totali) non si spezzano mai fra pagine.
      // Le tabelle lunghe spezzano normalmente con header ripetuto.
      Array.from(document.querySelectorAll('table')).forEach((tbl) => {
        const rows = tbl.querySelectorAll('tr').length
        if (rows <= 8) {
          ;(tbl as HTMLElement).style.breakInside = 'avoid'
          ;(tbl as HTMLElement).style.pageBreakInside = 'avoid'
        }
      })

      // 1. Strip ® e blocchi unicode
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
      const toFix: Text[] = []
      let n: Node | null
      while ((n = walker.nextNode())) {
        const t = n as Text
        if (t.nodeValue && /[®█░■□▒▓]/u.test(t.nodeValue)) toFix.push(t)
      }
      toFix.forEach((t) => {
        if (t.nodeValue) t.nodeValue = t.nodeValue.replace(/®/g, '').replace(/[█░■□▒▓]/gu, '')
      })

      // 2. Widget grafico peso punteggio
      Array.from(document.querySelectorAll('p')).forEach((p) => {
        if (!/Peso nel punteggio globale:\s*\d+/i.test(p.textContent || '')) return
        if ((p as HTMLElement).dataset.transformed === 'pesowidget') return
        const m = (p.textContent || '').match(/Peso nel punteggio globale:\s*(\d+)/i)
        if (!m) return
        const pct = Math.max(0, Math.min(100, parseInt(m[1], 10)))
        const widget = document.createElement('div')
        widget.className = 'area-weight-widget'
        widget.dataset.transformed = 'pesowidget'
        widget.innerHTML =
          '<div class="aww-label">Peso nel punteggio globale</div>' +
          '<div class="aww-track"><div class="aww-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="aww-value">' + pct + '<span class="aww-pct">%</span></div>'
        p.replaceWith(widget)
      })

      // 3+4. Cover/lettera duplicate rimosse + volume opener Vol II e III
      Object.keys(VOLUME_OPENER_INFO).forEach((volNum) => {
        const vol = document.querySelector('[data-volume="' + volNum + '"]') as HTMLElement | null
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
        const opener = document.createElement('div')
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

      // 5. Footer del template rimosso (la numerazione la mette Chromium)
      document.querySelectorAll('.diagnosi-footer').forEach((el) => el.remove())

      // 6. Running head contestuale per volume
      Object.keys(VOLUME_RUNNING_TITLES).forEach((volNum) => {
        const vol = document.querySelector('[data-volume="' + volNum + '"]')
        if (!vol) return
        vol.querySelectorAll('.section-header-title').forEach((el) => {
          el.textContent = VOLUME_RUNNING_TITLES[volNum]
        })
      })

      // 7. VALORE POTENZIALE come callout XL
      Array.from(document.querySelectorAll('tr')).forEach((tr) => {
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
        const box = document.createElement('div')
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

      // 8. Pull-quote XL per highlight con euro
      Array.from(document.querySelectorAll('.diagnosi-highlight')).forEach((hl) => {
        const txt = hl.textContent || ''
        if (/(\d+\s*milion[ei]\s*di\s*euro|\d+\s*mila\s*euro\s+all|€\s*[\d.,]+)/i.test(txt)) {
          hl.classList.add('is-pullquote-xl')
        }
      })

      // 9. Donut chart per PUNTEGGIO GLOBALE
      Array.from(document.querySelectorAll('tr')).forEach((tr) => {
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
        const dashboard = document.createElement('div')
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

      scope.setAttribute('data-diagnosi-transformed', '1')
    })

    // PDF metadata editoriali: title dinamico estratto dalla cover, niente
    // generator v0.app spurio. Migliora la riconoscibilita del file aperto
    // in Acrobat / Preview / mobile.
    await page.evaluate(() => {
      const azienda = document.querySelector(
        '.diagnosi-cover .cover-meta-row .cover-meta-label'
      )
      // Cerca la prima cover per ricavare AZIENDA + tipo
      const firstCover = document.querySelector('.diagnosi-cover')
      let aziendaName = ''
      if (firstCover) {
        const rows = firstCover.querySelectorAll('.cover-meta-row')
        rows.forEach((row) => {
          const label = (row.querySelector('.cover-meta-label')?.textContent || '')
            .toUpperCase()
            .trim()
          if (label.startsWith('AZIENDA')) {
            const txt = (row.textContent || '').replace(/AZIENDA:?/i, '').trim()
            if (txt) aziendaName = txt
          }
        })
      }
      const baseTitle = 'Diagnosi Strategica'
      document.title = aziendaName
        ? `${baseTitle} — ${aziendaName} — Metodo Cantiere`
        : `${baseTitle} — Metodo Cantiere`

      // Author/Subject/Keywords meta
      const upsert = (name: string, content: string) => {
        let m = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
        if (!m) {
          m = document.createElement('meta')
          m.setAttribute('name', name)
          document.head.appendChild(m)
        }
        m.setAttribute('content', content)
      }
      upsert('author', 'Metodo Cantiere')
      upsert(
        'subject',
        aziendaName
          ? `Diagnosi Strategica commerciale per ${aziendaName}`
          : 'Diagnosi Strategica commerciale Metodo Cantiere'
      )
      upsert(
        'keywords',
        'diagnosi strategica, metodo cantiere, edilizia, direzione commerciale, pipeline, vendite'
      )
    })

    await page.emulateMediaType('print')

    const footerTemplate = `
      <div style="font-family: 'Inter', -apple-system, sans-serif; font-size: 8pt; color: #888; width: 100%; padding: 0 22mm 0 24mm; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
        <span style="letter-spacing: 0.1em; text-transform: uppercase;">Metodo Cantiere &mdash; www.metodocantiere.com</span>
        <span style="font-family: 'JetBrains Mono', ui-monospace, monospace; color: #555;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </span>
      </div>`

    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate,
      margin: { top: '22mm', right: '22mm', bottom: '18mm', left: '24mm' },
      outline: true,
      tagged: true,
    })

    const filename = `diagnosi-${token}-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Errore generazione PDF:', error)
    return NextResponse.json(
      { error: 'Impossibile generare il PDF' },
      { status: 500 }
    )
  } finally {
    await browser.close()
  }
}
