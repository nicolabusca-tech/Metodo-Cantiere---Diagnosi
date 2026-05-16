import { NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export const runtime = 'nodejs'
export const maxDuration = 60

const LOCAL_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

async function resolveExecutablePath(): Promise<string> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return chromium.executablePath()
  }
  const { existsSync } = await import('node:fs')
  for (const p of LOCAL_CHROME_PATHS) {
    if (existsSync(p)) return p
  }
  return chromium.executablePath()
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

    await page.goto(printUrl, { waitUntil: 'networkidle0' })

    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready
      }
    })

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
