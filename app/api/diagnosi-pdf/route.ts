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

    // Pulizia contenuto dinamico emesso dal workflow:
    // 1) rimuove simbolo ® (marchio non ancora registrato)
    // 2) sostituisce le mini-bar ASCII di blocchi (█░) con widget SVG percentuale
    //    estraendo il numero da "Peso nel punteggio globale: NN%" nel paragrafo
    // 3) rimuove cover e lettera duplicate dai Volume 2 e 3 (la lettera ha
    //    senso solo all'inizio di Volume I)
    // 4) inserisce una pagina di apertura distintiva per Volume II e III
    //    (numero romano gigante stile libro)
    await page.evaluate(() => {
      // Step 1: strip ® e caratteri di blocco ASCII da tutti i text nodes
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
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

      // Step 2: trasforma "Peso nel punteggio globale: NN%" in widget grafico
      const pPesos = Array.from(document.querySelectorAll('p')).filter((p) =>
        /Peso nel punteggio globale:\s*\d+/i.test(p.textContent || '')
      )
      pPesos.forEach((p) => {
        const m = (p.textContent || '').match(/Peso nel punteggio globale:\s*(\d+)/i)
        if (!m) return
        const pct = Math.max(0, Math.min(100, parseInt(m[1], 10)))
        const widget = document.createElement('div')
        widget.className = 'area-weight-widget'
        widget.innerHTML =
          '<div class="aww-label">Peso nel punteggio globale</div>' +
          '<div class="aww-track"><div class="aww-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="aww-value">' + pct + '<span class="aww-pct">%</span></div>'
        p.replaceWith(widget)
      })

      // Step 3 + 4: cover e lettera duplicate sui volumi 2 e 3 vengono rimosse
      // e sostituite con una pagina di apertura volume stile libro
      const volumeOpenerInfo: Record<string, { num: string; title: string; subtitle: string }> = {
        '2': { num: 'II', title: 'La Diagnosi', subtitle: 'Dove si perdono i contratti' },
        '3': { num: 'III', title: 'Il Percorso', subtitle: "Piano d'azione in 90 giorni" },
      }
      Object.keys(volumeOpenerInfo).forEach((volNum) => {
        const vol = document.querySelector('[data-volume="' + volNum + '"]')
        if (!vol) return
        // n8n wrappa ogni volume in un suo <div class="diagnosi-document">
        // interno. Operiamo dentro a quel wrapper se esiste.
        const inner = vol.querySelector('.diagnosi-document') || vol
        // Rimuovi cover e lettera duplicate (ridondanti dopo Volume I)
        inner.querySelectorAll('.diagnosi-cover, .diagnosi-letter').forEach(
          (el) => el.remove()
        )
        // Rimuovi i diagnosi-page-break orfani all'inizio del wrapper:
        // erano fra cover, lettera e prima sezione, e ora generano
        // pagine vuote orfane.
        let firstChild = inner.firstElementChild
        while (firstChild && firstChild.classList.contains('diagnosi-page-break')) {
          firstChild.remove()
          firstChild = inner.firstElementChild
        }
        // Inserisci pagina opener distintiva all'inizio del volume (PRIMA
        // del wrapper inner, cosi e' il primo elemento del data-volume).
        const info = volumeOpenerInfo[volNum]
        const opener = document.createElement('div')
        opener.className = 'volume-opener'
        opener.innerHTML =
          '<div class="vol-opener-kicker">Volume</div>' +
          '<div class="vol-opener-number">' + info.num + '</div>' +
          '<div class="vol-opener-rule"></div>' +
          '<h1 class="vol-opener-title">' + info.title + '</h1>' +
          '<p class="vol-opener-subtitle">' + info.subtitle + '</p>'
        vol.insertBefore(opener, vol.firstChild)
      })

      // Step 5: footer del template rimosso (la numerazione la mette Chromium)
      document.querySelectorAll('.diagnosi-footer').forEach((el) => el.remove())

      // Step 6: running head contestuale per volume. Il template emette
      // "DIAGNOSI STRATEGICA" sempre uguale in ogni pagina interna. Lo
      // sostituiamo con il nome del volume corrente per dare al lettore
      // un riferimento sempre presente di dove si trova nel documento.
      const volumeRunningTitles: Record<string, string> = {
        '1': 'Volume I — La Fotografia',
        '2': 'Volume II — La Diagnosi',
        '3': "Volume III — Il Percorso",
      }
      Object.keys(volumeRunningTitles).forEach((volNum) => {
        const vol = document.querySelector('[data-volume="' + volNum + '"]')
        if (!vol) return
        vol.querySelectorAll('.section-header-title').forEach((el) => {
          el.textContent = volumeRunningTitles[volNum]
        })
      })

      // Step 7: VALORE POTENZIALE come numero XL editoriale. Le tabelle
      // di calcolo valore perso hanno una ultima riga "VALORE POTENZIALE
      // — descrizione | € X.XXX.XXX/anno". Estraiamo e creiamo un box
      // dedicato sotto la tabella con il numero in mono XL.
      Array.from(document.querySelectorAll('tr')).forEach((tr) => {
        const txt = tr.textContent || ''
        if (!/VALORE POTENZIALE/i.test(txt)) return
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
        tr.remove()
      })

      // Step 8: pull-quote XL stile rivista per le frasi chiave con
      // l'importo in euro (es. "Due milioni e ottocentomila euro all'anno").
      Array.from(document.querySelectorAll('.diagnosi-highlight')).forEach((hl) => {
        const txt = hl.textContent || ''
        if (/(\d+\s*milion[ei]\s*di\s*euro|\d+\s*mila\s*euro\s+all|€\s*[\d.,]+)/i.test(txt)) {
          hl.classList.add('is-pullquote-xl')
        }
      })

      // Step 9: donut chart SVG per il PUNTEGGIO GLOBALE della sintesi.
      // Sostituisce la riga di tabella "PUNTEGGIO GLOBALE | 100% | 41/100 |
      // PROFILO B — Nella media bassa" con un quadro visivo a cruscotto.
      Array.from(document.querySelectorAll('tr')).forEach((tr) => {
        const txt = tr.textContent || ''
        if (!/PUNTEGGIO GLOBALE/i.test(txt)) return
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
        tr.style.display = 'none'
      })
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
