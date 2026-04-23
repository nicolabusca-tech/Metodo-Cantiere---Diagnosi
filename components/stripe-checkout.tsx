'use client'

import { useState } from 'react'
import { createCheckoutSession } from '@/app/actions/stripe'
import { Button } from '@/components/ui/button'
import { getCheckoutPayButtonLabel } from '@/lib/products'

interface StripeCheckoutProps {
  productId: string
  userId: string
  customerEmail: string
}

export function StripeCheckout({ productId, userId, customerEmail }: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleCheckout = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('[v0] Starting checkout for:', { productId, userId })

      const { checkoutUrl } = await createCheckoutSession({
        productId,
        userId,
        customerEmail,
      })

      console.log('[v0] Redirecting to Stripe Checkout:', checkoutUrl)
      // Reindirizza a Stripe Checkout Session
      window.location.href = checkoutUrl
    } catch (err: any) {
      console.error('[v0] Checkout error:', err)
      setError(err.message || 'Errore durante il caricamento del pagamento')
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-semibold mb-2">Errore nel caricamento del pagamento</p>
        <p className="text-red-600 text-sm">{error}</p>
        <p className="text-red-500 text-xs mt-2">Verifica che le credenziali Stripe siano configurate correttamente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            Caricamento...
          </span>
        ) : (
          getCheckoutPayButtonLabel(productId)
        )}
      </Button>

      <p className="text-center text-xs text-neutral-500">
        Powered by Stripe Checkout - Pagamento sicuro e crittografato
      </p>
    </div>
  )
}
