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

    await page.emulateMediaType('print')

    const pdf = await page.pdf({
      format: 'a4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
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
