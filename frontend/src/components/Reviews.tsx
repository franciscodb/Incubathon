// =====================================================================
// Evaluación de profesionales: estrellas (display + input) y lista.
// =====================================================================
import { formatDate } from '../lib/format'
import type { Review } from '../lib/types'
import { IconStar } from './icons'

/** Fila de 5 estrellas para mostrar una calificación. */
export function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar
          key={i}
          width={size}
          height={size}
          className={i <= Math.round(rating) ? 'text-amber-400' : 'text-ink-200'}
        />
      ))}
    </span>
  )
}

/** Selector interactivo de estrellas (1–5). */
export function StarInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`${i} estrella${i === 1 ? '' : 's'}`}
          className="transition hover:scale-110"
        >
          <IconStar
            width={26}
            height={26}
            className={i <= value ? 'text-amber-400' : 'text-ink-200'}
          />
        </button>
      ))}
    </div>
  )
}

/** Lista de reseñas de un profesional. */
export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="mt-3 text-sm text-ink-500">Aún no hay evaluaciones públicas.</p>
  }
  return (
    <ul className="mt-4 space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-xl bg-white/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-ink-800">{r.author_name || 'Cliente'}</span>
            <StarRow rating={r.rating} />
          </div>
          {r.comment && <p className="mt-1.5 text-sm text-ink-600">{r.comment}</p>}
          {r.created_at && (
            <div className="mt-1 text-xs text-ink-400">{formatDate(r.created_at)}</div>
          )}
        </li>
      ))}
    </ul>
  )
}
