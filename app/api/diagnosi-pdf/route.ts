import { NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium-min'
import puppeteer from 'puppeteer-core'
import { applyDiagnosiTransforms } from '@/lib/diagnosi-transforms'

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

    // Trasformazioni grafiche condivise con la view a video (cliente):
    // strip ®, widget peso, volume-opener, running head dinamico, VP-callout XL,
    // pull-quote XL, donut chart. La funzione applyDiagnosiTransforms vive in
    // @/lib/diagnosi-transforms ed e' la stessa usata dal componente
    // DiagnosiViewer client-side per il rendering web. Il risultato visivo
    // e' identico fra PDF e schermo.
    // removeOldFooter:true perche' nel PDF la numerazione la mette Chromium
    // via footerTemplate, mentre a video lasciamo il footer template come
    // decorazione.
    await page.evaluate(applyDiagnosiTransforms, { removeOldFooter: true })

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
