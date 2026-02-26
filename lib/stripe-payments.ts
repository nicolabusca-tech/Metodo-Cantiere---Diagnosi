import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

interface SyncedPayment {
  success: boolean
  productId?: string
  userId?: string
  customerEmail?: string
  nome?: string
  cognome?: string
  azienda?: string
  error?: string
}

function getPaidColumn(productId: string) {
  return productId === 'diagnosi-strategica' ? 'paid_diagnosi' : 'paid_analisi'
}

export async function syncCheckoutSessionToDatabase(
  checkoutSession: Stripe.Checkout.Session
): Promise<SyncedPayment> {
  if (checkoutSession.payment_status !== 'paid') {
    return { success: false, error: 'Pagamento non completato' }
  }

  const userId = checkoutSession.metadata?.user_id
  const productId = checkoutSession.metadata?.product_id

  if (!userId || !productId) {
    return { success: false, error: 'Metadata mancanti nella sessione' }
  }

  const adminSupabase = createAdminClient()
  const amountPaid = checkoutSession.amount_total ? checkoutSession.amount_total / 100 : null
  const customerEmail = checkoutSession.customer_email || checkoutSession.metadata?.customer_email || ''
  const paidColumn = getPaidColumn(productId)

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    amount_paid: amountPaid,
    [paidColumn]: true,
  }

  const { error: updateError } = await adminSupabase
    .from('utenti')
    .update(updateData)
    .eq('id', userId)

  if (updateError) {
    return { success: false, error: `Errore aggiornamento utenti: ${updateError.message}` }
  }

  const { data: utentiRow } = await adminSupabase
    .from('utenti')
    .select('nome, cognome, azienda')
    .eq('id', userId)
    .limit(1)
    .single()

  return {
    success: true,
    productId,
    userId,
    customerEmail,
    nome: utentiRow?.nome ?? '',
    cognome: utentiRow?.cognome ?? '',
    azienda: utentiRow?.azienda ?? '',
  }
}

export async function syncCheckoutBySessionId(sessionId: string): Promise<SyncedPayment> {
  if (!sessionId) {
    return { success: false, error: 'Session ID mancante' }
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return syncCheckoutSessionToDatabase(session)
}

export async function getCheckoutSummary(sessionId: string): Promise<{
  success: boolean
  productId?: string
  error?: string
}> {
  if (!sessionId) {
    return { success: false, error: 'Session ID mancante' }
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return {
    success: true,
    productId: session.metadata?.product_id,
  }
}
