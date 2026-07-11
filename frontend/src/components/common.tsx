import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { IconBadgeCheck, IconStar } from './icons'

/** Isotipo oficial de CumplIA: la "C" circular con checkmark y trazos de circuito (IA). */
export function CumplIAMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cumplia-ring" x1="0.15" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#152a63" />
          <stop offset="0.5" stopColor="#1f57bf" />
          <stop offset="1" stopColor="#2f83f2" />
        </linearGradient>
      </defs>
      <g stroke="#1c3a7a" strokeWidth={2} strokeLinecap="round">
        <line x1="8" y1="23" x2="20" y2="23" />
        <line x1="6" y1="32" x2="18" y2="32" />
        <line x1="8" y1="41" x2="20" y2="41" />
      </g>
      <circle cx="6.5" cy="23" r="2" fill="#16c2c9" />
      <circle cx="4.5" cy="32" r="2" fill="#2f83f2" />
      <circle cx="6.5" cy="41" r="2" fill="#8b46f0" />
      <path d="M48.6 18.2A18 18 0 1 0 48.6 45.8" fill="none" stroke="url(#cumplia-ring)" strokeWidth={7.5} strokeLinecap="round" />
      <circle cx="48.6" cy="18.2" r="4.2" fill="#8b46f0" />
      <circle cx="48.6" cy="18.2" r="1.7" fill="#ffffff" />
      <path d="M26 33 31 38 41 24.5" fill="none" stroke="#16c2c9" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="CumplIA — inicio">
      {/* El isotipo vive siempre sobre su tile blanco (así está diseñado el logo). */}
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white shadow-card ring-1 ring-ink-900/5 transition-transform group-hover:scale-105">
        <CumplIAMark size={28} />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-lg font-extrabold tracking-tight">
            <span className={onDark ? 'text-white' : 'text-[#152a63]'}>Cumpl</span>
            <span className="bg-gradient-to-r from-[#2f83f2] via-[#16c2c9] to-[#8b46f0] bg-clip-text text-transparent">
              IA
            </span>
          </span>
          <span
            className={`mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] ${
              onDark ? 'text-white/70' : 'text-ink-400'
            }`}
          >
            Cumplimiento regulatorio
          </span>
        </span>
      )}
    </Link>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-amber-500">
      <IconStar width={14} height={14} />
      <span className="text-sm font-semibold text-slate-700">{rating.toFixed(1)}</span>
    </span>
  )
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="badge bg-brand-50 text-brand-700">
        <IconBadgeCheck width={14} height={14} /> Verificado
      </span>
    )
  }
  return <span className="badge bg-slate-100 text-slate-500">Sin verificar</span>
}

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div>
      {eyebrow && (
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-600">{eyebrow}</p>
      )}
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}
    </div>
  )
}
