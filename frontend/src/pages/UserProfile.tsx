import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as db from '../lib/db'
import { businessSummary } from '../lib/rules'
import { getProcedure, GIRO_LABELS } from '../data/catalog'
import { ComplianceGauge, SemaphoreDot } from '../components/Semaphore'
import { EmptyState, SectionTitle, Spinner } from '../components/common'
import {
  IconArrowRight,
  IconBadgeCheck,
  IconCheck,
  IconMapPin,
  IconPlus,
  IconStar,
  IconStore,
  IconUsers,
} from '../components/icons'
import type {
  Business,
  BusinessProcedure,
  ContactRequest,
  ContactStatus,
} from '../lib/types'

const CONTACT_STATUS: Record<ContactStatus, { label: string; cls: string }> = {
  nuevo: { label: 'Enviada', cls: 'bg-brand-50 text-brand-700' },
  contactado: { label: 'En contacto', cls: 'bg-amarillo-light text-amarillo-dark' },
  cerrado: { label: 'Trabajo cerrado', cls: 'bg-verde-light text-verde-dark' },
}

const IMPACTO: Record<string, { label: string; cls: string }> = {
  bajo: { label: 'Bajo impacto', cls: 'bg-verde-light text-verde-dark' },
  vecinal: { label: 'Impacto vecinal', cls: 'bg-amarillo-light text-amarillo-dark' },
  zonal: { label: 'Impacto zonal', cls: 'bg-naranja-light text-naranja-dark' },
}

export default function UserProfile() {
  const { profile } = useAuth()
  const { notify } = useToast()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [procsByBiz, setProcsByBiz] = useState<Record<string, BusinessProcedure[]>>({})
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)

  async function advanceStatus(r: ContactRequest, next: ContactStatus) {
    try {
      const updated = await db.updateContactRequest(r.id, next)
      setRequests((prev) => prev.map((x) => (x.id === r.id ? updated : x)))
      notify(
        next === 'cerrado'
          ? 'Trabajo cerrado. Ya puedes evaluar al profesional.'
          : 'Conexión actualizada',
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo actualizar', 'error')
    }
  }

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const list = await db.listBusinesses(profile.id)
      setBusinesses(list)
      const entries = await Promise.all(
        list.map(async (b) => [b.id, await db.getBusinessProcedures(b.id)] as const),
      )
      setProcsByBiz(Object.fromEntries(entries))
      setRequests(await db.listContactRequests(profile.id))
      setLoading(false)
    })()
  }, [profile])

  const avgCompliance = useMemo(() => {
    if (businesses.length === 0) return 0
    const total = businesses.reduce(
      (a, b) => a + businessSummary(procsByBiz[b.id] ?? []).cumplimiento_pct,
      0,
    )
    return Math.round(total / businesses.length)
  }, [businesses, procsByBiz])

  if (loading) return <Spinner label="Cargando tu cuenta…" />

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-mesh-twilight" />
      <div className="container-app relative py-8 lg:py-12">
        <SectionTitle
          eyebrow="Mi cuenta"
          title="Perfil y contacto"
          description="Tus datos personales, tus negocios y tus solicitudes a profesionales."
        />

        {/* Tarjeta de identidad */}
        <div className="mt-6 glass-card flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="grid h-16 w-16 flex-none place-items-center rounded-2xl text-xl font-extrabold text-white shadow-glow"
              style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}
            >
              {initials}
            </span>
            <div>
              <div className="font-display text-xl font-extrabold text-ink-900">
                {profile?.full_name || 'Usuario'}
              </div>
              <div className="text-sm text-ink-500">{profile?.email}</div>
              <span className="badge mt-2 bg-brand-50 text-brand-700">
                <IconBadgeCheck width={13} height={13} />
                {profile?.role === 'professional' ? 'Profesional' : 'Dueño de negocio'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { v: businesses.length, l: 'Negocios' },
              { v: `${avgCompliance}%`, l: 'Cumplimiento' },
              { v: requests.length, l: 'Solicitudes' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-2xl font-extrabold text-gradient">{s.v}</div>
                <div className="text-xs text-ink-500">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Datos de contacto */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="glass-card p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-ink-400">Correo</div>
            <div className="mt-1 text-sm font-semibold text-ink-800">{profile?.email}</div>
          </div>
          <div className="glass-card p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-ink-400">Teléfono</div>
            <div className="mt-1 text-sm font-semibold text-ink-800">
              {profile?.phone || 'No registrado'}
            </div>
          </div>
        </div>

        {/* Mis negocios (resumen con foto) */}
        <div className="mt-10 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Mis negocios</h2>
          <Link to="/negocio/nuevo" className="btn-glass">
            <IconPlus width={16} height={16} /> Nuevo negocio
          </Link>
        </div>

        {businesses.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<IconStore width={24} height={24} />}
              title="No tienes negocios"
              description="Registra un negocio para generar su matriz de cumplimiento."
              action={
                <Link to="/negocio/nuevo" className="btn-primary">
                  <IconPlus width={16} height={16} /> Registrar negocio
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => {
              const s = businessSummary(procsByBiz[b.id] ?? [])
              return (
                <Link
                  key={b.id}
                  to={`/app?b=${b.id}`}
                  className="glass-card card-hover flex flex-col overflow-hidden"
                >
                  <div className="relative h-32">
                    {b.photo_url ? (
                      <img src={b.photo_url} alt={b.nombre} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-brand-500 to-brand-700" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
                    <span
                      className={`badge absolute left-3 top-3 ${IMPACTO[b.nivel_impacto]?.cls}`}
                    >
                      {IMPACTO[b.nivel_impacto]?.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate font-display text-sm font-bold text-ink-900">
                        {b.nombre}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-500">
                        <IconMapPin width={12} height={12} /> {GIRO_LABELS[b.giro]} · {b.alcaldia}
                      </div>
                    </div>
                    <ComplianceGauge pct={s.cumplimiento_pct} color={s.color} size={46} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Mis conexiones con profesionales */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-ink-900">
              Mis conexiones con profesionales
            </h2>
            <span className="text-xs text-ink-400">
              Da seguimiento y evalúa al cerrar el trabajo
            </span>
          </div>
          {requests.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">
              No has contactado profesionales todavía.{' '}
              <Link to="/marketplace" className="font-semibold text-brand-600 hover:underline">
                Explorar marketplace →
              </Link>
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {requests.map((r) => {
                const st = CONTACT_STATUS[r.status] ?? CONTACT_STATUS.nuevo
                return (
                  <li key={r.id} className="glass-card flex flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 truncate text-sm font-bold text-ink-800">
                        <IconUsers width={15} height={15} className="flex-none text-brand-600" />
                        {r.professional_nombre || 'Profesional'}
                      </span>
                      <span className={`badge flex-none text-[10px] ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="mt-1 text-xs text-ink-500">
                      {r.procedure_code ? getProcedure(r.procedure_code)?.name : 'Consulta general'}
                      {r.business_nombre ? ` · ${r.business_nombre}` : ''}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-ink-400">{r.message}</p>

                    {/* Seguimiento */}
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                      {r.status === 'nuevo' && (
                        <button
                          onClick={() => advanceStatus(r, 'contactado')}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Marcar en contacto
                        </button>
                      )}
                      {r.status === 'contactado' && (
                        <button
                          onClick={() => advanceStatus(r, 'cerrado')}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          <IconCheck width={13} height={13} /> Marcar trabajo cerrado
                        </button>
                      )}
                      {r.status === 'cerrado' && (
                        <Link
                          to={`/profesional/${r.professional_id}`}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          <IconStar width={13} height={13} /> Evaluar profesional
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-400">
            Los pagos por servicios se acuerdan directamente con cada profesional; la plataforma no
            interviene en esos cobros.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <Link to="/app" className="btn-glass">
            Ir a la matriz de cumplimiento <IconArrowRight width={16} height={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
