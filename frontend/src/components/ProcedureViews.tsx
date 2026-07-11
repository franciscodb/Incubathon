// =====================================================================
// Vistas de trámites del negocio: card (grid) y fila (lista).
// Cada categoría tiene su icono y color para una lectura rápida y amigable.
// =====================================================================
import type { ComponentType, SVGProps } from 'react'
import { Link } from 'react-router-dom'
import type { ProcedureRow } from '../lib/types'
import { CATEGORY_LABELS } from '../data/catalog'
import { expiryLabel, STATUS_LABEL } from '../lib/format'
import { SemaphoreDot, StatusBadge } from './Semaphore'
import {
  IconBriefcase,
  IconBuilding,
  IconChevronRight,
  IconDoc,
  IconFlame,
  IconHardHat,
  IconHeartPulse,
  IconLeaf,
  IconReceipt,
  IconStore,
} from './icons'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

interface CategoryMeta {
  icon: IconType
  tone: string // clases de fondo + texto para el cuadro del icono
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  fiscal: { icon: IconReceipt, tone: 'bg-violet-50 text-violet-600' },
  operacion: { icon: IconStore, tone: 'bg-amber-50 text-amber-600' },
  inmueble: { icon: IconBuilding, tone: 'bg-sky-50 text-sky-600' },
  sanitario: { icon: IconHeartPulse, tone: 'bg-teal-50 text-teal-600' },
  proteccion_civil: { icon: IconFlame, tone: 'bg-orange-50 text-orange-600' },
  seguridad: { icon: IconHardHat, tone: 'bg-indigo-50 text-indigo-600' },
  ambiental: { icon: IconLeaf, tone: 'bg-emerald-50 text-emerald-600' },
  laboral: { icon: IconBriefcase, tone: 'bg-rose-50 text-rose-600' },
}

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? { icon: IconDoc, tone: 'bg-ink-100 text-ink-600' }
}

function subtitle(r: ProcedureRow): string {
  return r.fecha_vencimiento ? expiryLabel(r.fecha_vencimiento) ?? STATUS_LABEL[r.status] : STATUS_LABEL[r.status]
}

/** Card grande y amigable (vista en cuadrícula). */
export function ProcedureCard({ businessId, row }: { businessId: string; row: ProcedureRow }) {
  const meta = categoryMeta(row.catalog.category)
  const Icon = meta.icon
  return (
    <Link
      to={`/negocio/${businessId}/tramite/${row.procedure_code}`}
      className="group glass-card card-hover flex flex-col p-5 hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${meta.tone}`}>
          <Icon width={22} height={22} />
        </span>
        <SemaphoreDot color={row.semaphore} size="lg" pulse={row.semaphore === 'rojo'} />
      </div>

      <div className="mt-3.5 flex-1">
        <span className="badge bg-ink-100 text-[10px] text-ink-500">
          {CATEGORY_LABELS[row.catalog.category] ?? row.catalog.category}
        </span>
        <h3 className="mt-2 line-clamp-2 font-display text-sm font-bold text-ink-900">
          {row.catalog.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-ink-500">{row.catalog.authority}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink-100 pt-3">
        <StatusBadge color={row.semaphore} status={row.status} />
        <span className="truncate text-right text-[11px] text-ink-400">{subtitle(row)}</span>
      </div>
    </Link>
  )
}

/** Fila compacta (vista en lista) con icono de categoría. */
export function ProcedureListItem({ businessId, row }: { businessId: string; row: ProcedureRow }) {
  const meta = categoryMeta(row.catalog.category)
  const Icon = meta.icon
  return (
    <Link
      to={`/negocio/${businessId}/tramite/${row.procedure_code}`}
      className="group glass-card card-hover flex items-center gap-4 p-4 hover:border-brand-300"
    >
      <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${meta.tone}`}>
        <Icon width={20} height={20} />
      </span>
      <SemaphoreDot color={row.semaphore} size="lg" pulse={row.semaphore === 'rojo'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-bold text-ink-800">{row.catalog.name}</span>
          <span className="badge bg-ink-100 text-[10px] text-ink-500">
            {CATEGORY_LABELS[row.catalog.category] ?? row.catalog.category}
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-ink-500">{row.catalog.authority}</div>
      </div>
      <div className="hidden text-right sm:block">
        <StatusBadge color={row.semaphore} status={row.status} />
        <div className="mt-1 text-xs text-ink-400">{subtitle(row)}</div>
      </div>
      <IconChevronRight
        width={18}
        height={18}
        className="flex-none text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
      />
    </Link>
  )
}
