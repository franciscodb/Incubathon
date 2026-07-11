// =====================================================================
// Modelo de precios de suscripción — híbrido por volumen.
// ESPEJO de backend/app/pricing.py. Editar ambos para mantener paridad.
//
// Se paga por cada negocio dado de alta; el precio unitario baja por volumen
// y cada negocio con venta de alcohol suma un recargo.
// =====================================================================

export type BillingInterval = 'monthly' | 'annual'

/** Negocios gratis por cuenta (freemium). */
export const FREE_SEATS = 1

/** Bandas de precio base por negocio (MXN/mes) según cantidad total. */
export const VOLUME_BANDS: { min: number; unit: number; label: string }[] = [
  { min: 1, unit: 399, label: '1 negocio' },
  { min: 2, unit: 320, label: '2 a 5 negocios' },
  { min: 6, unit: 260, label: '6 o más negocios' },
]

/** Recargo por cada negocio con venta de alcohol (MXN/mes). */
export const ALCOHOL_SURCHARGE = 250

/** Meses cobrados en el plan anual (2 gratis => 10). */
export const ANNUAL_MONTHS = 10

export interface Quote {
  businesses: number
  alcohol_businesses: number
  interval: BillingInterval
  unit_price: number
  base_subtotal: number
  alcohol_surcharge: number
  monthly_total: number
  billed_total: number
  monthly_equivalent: number
  annual_savings: number
  amount_cents: number
  currency: string
}

/** Precio unitario por negocio según la banda de volumen. */
export function unitPriceFor(businesses: number): number {
  let price = VOLUME_BANDS[0].unit
  for (const b of VOLUME_BANDS) {
    if (businesses >= b.min) price = b.unit
  }
  return price
}

/** Calcula la cotización en el cliente (para la calculadora en vivo). */
export function computeQuote(
  businesses: number,
  alcoholBusinesses: number,
  interval: BillingInterval = 'monthly',
): Quote {
  const b = Math.max(1, Math.floor(businesses))
  const alc = Math.max(0, Math.min(Math.floor(alcoholBusinesses), b))
  const unit = unitPriceFor(b)
  const baseSubtotal = b * unit
  const alcoholSurcharge = alc * ALCOHOL_SURCHARGE
  const monthlyTotal = baseSubtotal + alcoholSurcharge

  let billedTotal: number
  let monthlyEquivalent: number
  let annualSavings: number
  if (interval === 'annual') {
    billedTotal = monthlyTotal * ANNUAL_MONTHS
    monthlyEquivalent = Math.round(billedTotal / 12)
    annualSavings = monthlyTotal * 12 - billedTotal
  } else {
    billedTotal = monthlyTotal
    monthlyEquivalent = monthlyTotal
    annualSavings = 0
  }

  return {
    businesses: b,
    alcohol_businesses: alc,
    interval,
    unit_price: unit,
    base_subtotal: baseSubtotal,
    alcohol_surcharge: alcoholSurcharge,
    monthly_total: monthlyTotal,
    billed_total: billedTotal,
    monthly_equivalent: monthlyEquivalent,
    annual_savings: annualSavings,
    amount_cents: billedTotal * 100,
    currency: 'mxn',
  }
}
