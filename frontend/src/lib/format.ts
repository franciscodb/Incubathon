import type { ProcedureStatus, Semaphore } from './types'
import { daysUntil } from './rules'

/** Formatea un monto en pesos mexicanos sin decimales (p.ej. "$1,210"). */
export function formatMoney(mxn: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(mxn)
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const STATUS_LABEL: Record<ProcedureStatus, string> = {
  pendiente: 'Pendiente',
  en_tramite: 'En trámite',
  vigente: 'Vigente',
  vencido: 'Vencido',
  no_aplica: 'No aplica',
}

export const SEMAPHORE_LABEL: Record<Semaphore, string> = {
  verde: 'En regla',
  amarillo: 'Por vencer',
  naranja: 'Pendiente',
  rojo: 'Crítico',
}

export const SEMAPHORE_HEX: Record<Semaphore, string> = {
  verde: '#16a34a',
  amarillo: '#ca8a04',
  naranja: '#ea580c',
  rojo: '#dc2626',
}

/** Texto de vencimiento amigable ("vence en 25 días", "vencido hace 10 días"). */
export function expiryLabel(iso?: string | null): string | null {
  const d = daysUntil(iso)
  if (d === null) return null
  if (d < 0) return `Venció hace ${Math.abs(d)} día${Math.abs(d) === 1 ? '' : 's'}`
  if (d === 0) return 'Vence hoy'
  if (d <= 60) return `Vence en ${d} día${d === 1 ? '' : 's'}`
  return `Vigente · vence ${formatDate(iso)}`
}
