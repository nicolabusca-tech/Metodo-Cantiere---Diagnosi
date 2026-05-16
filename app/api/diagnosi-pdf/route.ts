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
    await page.evaluate(() => {
      // Step 1: strip ® da tutti i text nodes
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

      // Step 2: trova i <p> con "Peso nel punteggio globale: NN%" e sostituisci
      // con un widget grafico vero (barra orizzontale gradient + percent label)
      const pPesos = Array.from(document.querySelectorAll('p')).filter((p) =>
        /Peso nel punteggio globale:\s*\d+/i.test(p.textContent || '')
      )
      pPesos.forEach((p) => {
        const m = (p.textContent || '').match(/Peso nel punteggio globale:\s*(\d+)/i)
        if (!m) return
        const pct = Math.max(0, Math.min(100, parseInt(m[1], 10)))
        const widget = document.createElement('div')
        widget.className = 'area-weight-widget'
        widget.innerHTML = `
          <div class="aww-label">Peso nel punteggio globale</div>
          <div class="aww-track"><div class="aww-fill" style="width:${pct}%"></div></div>
          <div class="aww-value">${pct}<span class="aww-pct">%</span></div>
        `
        p.replaceWith(widget)
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

    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
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
