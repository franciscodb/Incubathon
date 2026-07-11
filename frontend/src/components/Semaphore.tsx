import type { ProcedureStatus, Semaphore } from '../lib/types'
import { SEMAPHORE_LABEL, STATUS_LABEL } from '../lib/format'

const DOT: Record<Semaphore, string> = {
  verde: 'bg-verde',
  amarillo: 'bg-amarillo',
  naranja: 'bg-naranja',
  rojo: 'bg-rojo',
}

const CHIP: Record<Semaphore, string> = {
  verde: 'bg-verde-light text-verde-dark',
  amarillo: 'bg-amarillo-light text-amarillo-dark',
  naranja: 'bg-naranja-light text-naranja-dark',
  rojo: 'bg-rojo-light text-rojo-dark',
}

const RING: Record<Semaphore, string> = {
  verde: 'ring-verde/30',
  amarillo: 'ring-amarillo/30',
  naranja: 'ring-naranja/30',
  rojo: 'ring-rojo/30',
}

export function SemaphoreDot({
  color,
  size = 'md',
  pulse = false,
}: {
  color: Semaphore
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}) {
  const s = size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'
  return (
    <span
      className={`inline-block rounded-full ${DOT[color]} ${s} ${
        pulse && color !== 'verde' ? 'animate-pulse-ring' : ''
      }`}
    />
  )
}

/** Chip con color + etiqueta, para status de un trámite. */
export function StatusBadge({
  color,
  status,
}: {
  color: Semaphore
  status?: ProcedureStatus
}) {
  return (
    <span className={`badge ${CHIP[color]}`}>
      <SemaphoreDot color={color} size="sm" />
      {status ? STATUS_LABEL[status] : SEMAPHORE_LABEL[color]}
    </span>
  )
}

/** Semáforo grande vertical (verde/amarillo/naranja/rojo) con el activo iluminado. */
export function SemaphoreLight({ active }: { active: Semaphore }) {
  const order: Semaphore[] = ['rojo', 'naranja', 'amarillo', 'verde']
  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-2xl bg-slate-900 p-3">
      {order.map((c) => (
        <span
          key={c}
          className={`h-5 w-5 rounded-full transition-all ${
            active === c ? `${DOT[c]} shadow-[0_0_12px] ring-4 ${RING[c]}` : 'bg-slate-700'
          }`}
          style={active === c ? { boxShadow: `0 0 14px 2px currentColor` } : undefined}
        />
      ))}
    </div>
  )
}

const RADIUS = 34
const CIRC = 2 * Math.PI * RADIUS

/** Medidor circular de porcentaje de cumplimiento con color de semáforo. */
export function ComplianceGauge({
  pct,
  color,
  size = 96,
}: {
  pct: number
  color: Semaphore
  size?: number
}) {
  const hex = {
    verde: '#16a34a',
    amarillo: '#ca8a04',
    naranja: '#ea580c',
    rojo: '#dc2626',
  }[color]
  const offset = CIRC - (Math.max(0, Math.min(100, pct)) / 100) * CIRC
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={RADIUS}
          fill="none"
          stroke={hex}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-extrabold text-slate-900">{pct}%</span>
      </div>
    </div>
  )
}
