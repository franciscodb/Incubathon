import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as db from '../lib/db'
import { CATALOG, getProcedure } from '../data/catalog'
import { EmptyState, SectionTitle, Spinner, Stars, VerifiedBadge } from '../components/common'
import { IconArrowRight, IconMapPin, IconSearch, IconUsers } from '../components/icons'
import type { Professional } from '../lib/types'

export default function Marketplace() {
  const [params, setParams] = useSearchParams()
  const procedureFilter = params.get('procedure') ?? ''
  const [all, setAll] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  useEffect(() => {
    db.listProfessionals()
      .then(setAll)
      .finally(() => setLoading(false))
  }, [])

  const especialidades = useMemo(
    () => Array.from(new Set(all.flatMap((p) => p.especialidades))).sort(),
    [all],
  )

  const filtered = useMemo(() => {
    return all.filter((p) => {
      if (verifiedOnly && !p.verified) return false
      if (procedureFilter && !p.procedures_codes.includes(procedureFilter)) return false
      if (especialidad && !p.especialidades.includes(especialidad)) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = [p.nombre, p.profesion, p.bio, ...p.especialidades].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [all, verifiedOnly, procedureFilter, especialidad, search])

  const proc = procedureFilter ? getProcedure(procedureFilter) : undefined

  if (loading) return <Spinner label="Cargando profesionales…" />

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-mesh-twilight" />
      <div className="container-app relative py-8 lg:py-12">
        <SectionTitle
          eyebrow="Marketplace"
          title="Profesionales verificados"
          description="Abogados, arquitectos, DRO, ingenieros, unidades de verificación, protección civil y laboratorios especializados en trámites de CDMX."
        />

        {proc && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/80 px-5 py-3.5">
            <div className="flex items-center gap-2 text-sm text-brand-800">
              <IconUsers width={18} height={18} />
              Mostrando profesionales para: <strong>{proc.name}</strong>
            </div>
            <button
              onClick={() => setParams({})}
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              Quitar filtro
            </button>
          </div>
        )}

        {/* Controles */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <IconSearch
              width={18}
              height={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              className="input pl-10"
              placeholder="Buscar por nombre, especialidad o trámite…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select sm:w-64"
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
          >
            <option value="">Todas las especialidades</option>
            {especialidades.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <button
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`badge border px-4 py-2.5 transition ${
              verifiedOnly
                ? 'border-transparent text-white shadow-glow'
                : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
            }`}
            style={verifiedOnly ? { backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' } : {}}
          >
            Solo verificados
          </button>
        </div>

        {/* Trámites rápidos */}
        {!proc && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATALOG.filter((c) => all.some((p) => p.procedures_codes.includes(c.code)))
              .slice(0, 10)
              .map((c) => (
                <button
                  key={c.code}
                  onClick={() => setParams({ procedure: c.code })}
                  className="badge-glass whitespace-nowrap hover:text-brand-700"
                >
                  {c.name}
                </button>
              ))}
          </div>
        )}

        {/* Resultados */}
        <div className="mt-6">
          <div className="mb-3 text-sm text-ink-500">
            {filtered.length} profesional{filtered.length === 1 ? '' : 'es'}
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<IconUsers width={24} height={24} />}
              title="Sin resultados"
              description="Ajusta los filtros o la búsqueda para encontrar profesionales."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <div key={p.id} className="glass-card card-hover flex flex-col p-5">
                  <div className="flex items-center gap-3.5">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={p.nombre}
                        className="h-14 w-14 flex-none rounded-2xl object-cover shadow-sm ring-1 ring-white/70"
                      />
                    ) : (
                      <span
                        className="grid h-14 w-14 flex-none place-items-center rounded-2xl text-base font-extrabold text-white"
                        style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}
                      >
                        {p.nombre.slice(0, 1)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-display text-sm font-bold text-ink-900">{p.nombre}</div>
                      <div className="truncate text-xs text-ink-500">{p.profesion}</div>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center justify-between">
                    <Stars rating={p.rating} />
                    <VerifiedBadge verified={p.verified} />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-ink-600">{p.bio}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.especialidades.slice(0, 3).map((e) => (
                      <span key={e} className="badge bg-brand-50 text-[11px] text-brand-700">
                        {e}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
                    <IconMapPin width={14} height={14} />
                    {p.alcaldias.slice(0, 2).join(', ') || 'CDMX'}
                    {p.alcaldias.length > 2 ? ` +${p.alcaldias.length - 2}` : ''}
                  </div>

                  <Link to={`/profesional/${p.id}`} className="btn-primary mt-4 w-full">
                    Ver perfil y contactar <IconArrowRight width={16} height={16} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
