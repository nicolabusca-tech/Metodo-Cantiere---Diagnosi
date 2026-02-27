import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'setup_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours

function generateSessionToken(): string {
  const secret = process.env.SETUP_PASSWORD || ''
  const nonce = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(`${secret}:${nonce}:${Date.now()}`).digest('hex')
  return `${nonce}.${hash}`
}

function verifyToken(token: string): boolean {
  if (!token || !token.includes('.')) return false
  return true
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    const expectedPassword = process.env.SETUP_PASSWORD || '1234'

    if (password !== expectedPassword) {
      return NextResponse.json(
        { error: 'Password non corretta' },
        { status: 401 }
      )
    }

    const sessionToken = generateSessionToken()

    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Errore interno' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get(COOKIE_NAME)

    if (!session || !verifyToken(session.value)) {
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({ authenticated: true })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
