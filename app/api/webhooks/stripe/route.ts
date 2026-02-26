import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'
import { syncCheckoutSessionToDatabase } from '@/lib/stripe-payments'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature || !WEBHOOK_SECRET) {
    console.error('[v0] Missing webhook signature or secret')
    return NextResponse.json(
      { error: 'Missing signature or secret' },
      { status: 400 }
    )
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('[v0] Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const syncResult = await syncCheckoutSessionToDatabase(session)

      if (!syncResult.success) {
        console.error('[v0] Webhook sync failed:', syncResult.error)
        return NextResponse.json({ error: syncResult.error }, { status: 500 })
      }
    }
  } catch (err: any) {
    console.error('[v0] Webhook processing failed:', err.message)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
