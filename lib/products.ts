export interface Product {
  id: string
  name: string
  description: string
  priceInCents: number
}

export const PRODUCTS: Product[] = [
  {
    id: 'analisi-lampo',
    name: 'Analisi Lampo',
    description: 'La radiografia veloce della tua impresa digitale',
    priceInCents: 14700, // €147.00
  },
  {
    id: 'diagnosi-strategica',
    name: 'Diagnosi Strategica',
    description: 'Analisi approfondita e roadmap per la crescita digitale',
    priceInCents: 49700, // €497.00
  },
]

/** Es. 49700 → "€497,00" (allineato alle label UI esistenti) */
export function formatPriceEurIt(priceInCents: number): string {
  const euros = priceInCents / 100
  const [intPart, decPart = '00'] = euros.toFixed(2).split('.')
  return `€${intPart},${decPart}`
}

export function getCheckoutPayButtonLabel(productId: string): string {
  const product = PRODUCTS.find((p) => p.id === productId)
  if (!product) return 'Procedi al pagamento'
  return `Avanti: procedi al pagamento - ${formatPriceEurIt(product.priceInCents)}`
}
