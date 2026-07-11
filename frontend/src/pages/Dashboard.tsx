import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as db from '../lib/db'
import { buildProcedureRows } from '../lib/derive'
import { businessSummary, daysUntil } from '../lib/rules'
import { GIRO_LABELS } from '../data/catalog'
import { ComplianceGauge, SemaphoreDot } from '../components/Semaphore'
import { GradeBadge, GradeSeal } from '../components/Grade'
import { ProcedureCard, ProcedureListItem } from '../components/ProcedureViews'
import { EmptyState, SectionTitle, Spinner } from '../components/common'
import {
  IconAlert,
  IconGrid,
  IconList,
  IconMapPin,
  IconPlus,
  IconSort,
  IconStore,
} from '../components/icons'
import type { Business, BusinessProcedure, ProcedureRow, Semaphore } from '../lib/types'

type ViewMode = 'grid' | 'list'
type SortMode = 'urgencia' | 'vencimiento' | 'nombre' | 'categoria'

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'urgencia', label: 'Urgencia' },
  { key: 'vencimiento', label: 'Próximo a vencer' },
  { key: 'nombre', label: 'Nombre (A–Z)' },
  { key: 'categoria', label: 'Categoría' },
]

/** Ordena las filas según el modo elegido (urgencia = orden por severidad ya calculado). */
function sortRows(rows: ProcedureRow[], mode: SortMode): ProcedureRow[] {
  if (mode === 'urgencia') return rows
  const copy = [...rows]
  if (mode === 'nombre') return copy.sort((a, b) => a.catalog.name.localeCompare(b.catalog.name))
  if (mode === 'categoria')
    return copy.sort(
      (a, b) =>
        (a.catalog.category ?? '').localeCompare(b.catalog.category ?? '') ||
        a.catalog.name.localeCompare(b.catalog.name),
    )
  // vencimiento: más próximos primero; sin fecha al final
  return copy.sort((a, b) => {
    const da = daysUntil(a.fecha_vencimiento)
    const db_ = daysUntil(b.fecha_vencimiento)
    if (da === null && db_ === null) return a.catalog.name.localeCompare(b.catalog.name)
    if (da === null) return 1
    if (db_ === null) return -1
    return da - db_
  })
}

const IMPACTO_CHIP: Record<string, string> = {
  bajo: 'bg-verde-light text-verde-dark',
  vecinal: 'bg-amarillo-light text-amarillo-dark',
  zonal: 'bg-naranja-light text-naranja-dark',
}

const FILTERS: { key: Semaphore | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'rojo', label: 'Críticos' },
  { key: 'naranja', label: 'Pendientes' },
  { key: 'amarillo', label: 'Por vencer' },
  { key: 'verde', label: 'En regla' },
]

export default function Dashboard() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [procsByBiz, setProcsByBiz] = useState<Record<string, BusinessProcedure[]>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Semaphore | 'todos'>('todos')
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem('buro_tramites_view') as ViewMode) || 'grid',
  )
  const [sort, setSort] = useState<SortMode>('urgencia')

  useEffect(() => {
    localStorage.setItem('buro_tramites_view', view)
  }, [view])

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const list = await db.listBusinesses(profile.id)
      setBusinesses(list)
      const entries = await Promise.all(
        list.map(async (b) => [b.id, await db.getBusinessProcedures(b.id)] as const),
      )
      setProcsByBiz(Object.fromEntries(entries))
      setLoading(false)
    })()
  }, [profile])

  const selectedId = params.get('b') || businesses[0]?.id
  const business = businesses.find((b) => b.id === selectedId)
  const procs = business ? procsByBiz[business.id] ?? [] : []

  const rows: ProcedureRow[] = useMemo(() => buildProcedureRows(procs), [procs])
  const summary = useMemo(() => businessSummary(procs), [procs])
  const visibleRows = filter === 'todos' ? rows : rows.filter((r) => r.semaphore === filter)
  const sortedRows = sortRows(visibleRows, sort)

  if (loading) return <Spinner label="Cargando tus negocios…" />

  if (businesses.length === 0) {
    return (
      <div className="container-app py-10">
        <SectionTitle eyebrow="Dashboard" title="Trámites por negocio" />
        <div className="mt-8">
          <EmptyState
            icon={<IconStore width={24} height={24} />}
            title="Aún no tienes negocios registrados"
            description="Registra tu primer restaurante, bar o café para generar su matriz de cumplimiento."
            action={
              <Link to="/negocio/nuevo" className="btn-primary">
                <IconPlus width={16} height={16} /> Diagnosticar mi primer negocio
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container-app py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Dashboard"
          title="Trámites por negocio"
          description="Matriz de cumplimiento con estatus, vigencias y fechas de vencimiento."
        />
        <Link to="/negocio/nuevo" className="btn-primary">
          <IconPlus width={16} height={16} /> Nuevo negocio
        </Link>
      </div>

      {/* Selector / tabs por negocio */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {businesses.map((b) => {
          const s = businessSummary(procsByBiz[b.id] ?? [])
          const active = b.id === selectedId
          return (
            <button
              key={b.id}
              onClick={() => setParams({ b: b.id })}
              className={`flex min-w-[200px] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                active ? 'border-brand-500 bg-white shadow-card' : 'border-transparent bg-white/70 hover:bg-white'
              }`}
            >
              <SemaphoreDot color={s.color} size="lg" pulse={active} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink-800">{b.nombre}</span>
                <span className="block truncate text-xs text-ink-500">
                  {GIRO_LABELS[b.giro]} · {s.cumplimiento_pct}% en regla
                </span>
              </span>
              <GradeBadge grade={s.grade} size="sm" />
            </button>
          )
        })}
      </div>

      {business && (
        <>
          {/* Encabezado del negocio */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="glass-card overflow-hidden lg:col-span-2">
              {/* Banner con foto del negocio */}
              <div className="relative h-28">
                {business.photo_url ? (
                  <img src={business.photo_url} alt={business.nombre} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-brand-500 to-brand-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/50 to-transparent" />
                <span className={`badge absolute right-3 top-3 ${IMPACTO_CHIP[business.nivel_impacto]}`}>
                  {business.nivel_impacto === 'bajo'
                    ? 'Bajo impacto'
                    : business.nivel_impacto === 'vecinal'
                      ? 'Impacto vecinal'
                      : 'Impacto zonal'}
                </span>
              </div>
              <div className="flex items-center gap-5 p-6">
                <GradeSeal grade={summary.grade} score={summary.score} size={92} />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-extrabold text-ink-900">
                    {business.nombre}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                    <IconMapPin width={15} height={15} /> {GIRO_LABELS[business.giro]} · {business.alcaldia}
                  </p>
                  <div className="mt-2">
                    <GradeBadge grade={summary.grade} showDescriptor />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="badge bg-ink-100 text-ink-600">{business.aforo} personas</span>
                    <span className="badge bg-ink-100 text-ink-600">{business.superficie_m2} m²</span>
                    <span className="badge bg-ink-100 text-ink-600">
                      {business.num_trabajadores} trabajadores
                    </span>
                    <Link
                      to={`/negocio/${business.id}/editar`}
                      className="badge bg-brand-50 text-brand-700 hover:bg-brand-100"
                    >
                      Editar datos
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Medidor + conteo por semáforo */}
            <div className="glass-card flex flex-col gap-4 p-6">
              <div className="flex items-center gap-4">
                <ComplianceGauge pct={summary.cumplimiento_pct} color={summary.color} size={72} />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink-800">{summary.cumplimiento_pct}% en regla</div>
                  <div className="text-xs text-ink-500">
                    {summary.counts.verde} de {summary.total} trámites vigentes
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['rojo', 'naranja', 'amarillo', 'verde'] as Semaphore[]).map((c) => (
                <div key={c} className="rounded-xl border border-white/50 bg-white/50 p-3">
                  <div className="flex items-center gap-2">
                    <SemaphoreDot color={c} />
                    <span className="font-display text-2xl font-extrabold text-ink-900">
                      {summary.counts[c]}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-ink-500">
                    {c === 'rojo'
                      ? 'Críticos'
                      : c === 'naranja'
                        ? 'Pendientes'
                        : c === 'amarillo'
                          ? 'Por vencer'
                          : 'En regla'}
                  </div>
                </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alertas de vencimiento */}
          {summary.proximos_vencer > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-amarillo/30 bg-amarillo-light/60 px-5 py-3.5 text-amarillo-dark">
              <IconAlert width={20} height={20} />
              <span className="text-sm font-medium">
                {summary.proximos_vencer} trámite{summary.proximos_vencer === 1 ? '' : 's'} próximo
                {summary.proximos_vencer === 1 ? '' : 's'} a vencer. Renueva a tiempo para evitar
                sanciones.
              </span>
            </div>
          )}

          {/* Toolbar: filtros + ordenar + vista */}
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const count =
                  f.key === 'todos' ? rows.length : rows.filter((r) => r.semaphore === f.key).length
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`badge border transition ${
                      filter === f.key
                        ? 'border-transparent text-white shadow-glow'
                        : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                    }`}
                    style={filter === f.key ? { backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' } : {}}
                  >
                    {f.key !== 'todos' && <SemaphoreDot color={f.key} size="sm" />}
                    {f.label} <span className="opacity-70">({count})</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              {/* Ordenar */}
              <div className="relative">
                <IconSort
                  width={16}
                  height={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <select
                  className="select w-auto py-2 pl-9 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  aria-label="Ordenar trámites"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle de vista */}
              <div className="inline-flex flex-none rounded-xl border border-ink-200 bg-white p-0.5">
                {(['grid', 'list'] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-label={v === 'grid' ? 'Vista de cuadrícula' : 'Vista de lista'}
                    aria-pressed={view === v}
                    className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                      view === v ? 'bg-brand-50 text-brand-700' : 'text-ink-400 hover:text-ink-600'
                    }`}
                  >
                    {v === 'grid' ? <IconGrid width={17} height={17} /> : <IconList width={17} height={17} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trámites (cards en cuadrícula o filas en lista) */}
          {sortedRows.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-ink-300 py-10 text-center text-sm text-ink-400">
              No hay trámites en esta categoría.
            </div>
          ) : view === 'grid' ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedRows.map((r) => (
                <ProcedureCard key={r.procedure_code} businessId={business.id} row={r} />
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {sortedRows.map((r) => (
                <ProcedureListItem key={r.procedure_code} businessId={business.id} row={r} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
