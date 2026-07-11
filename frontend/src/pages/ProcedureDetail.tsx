import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import * as db from '../lib/db'
import { getProcedure, CATEGORY_LABELS } from '../data/catalog'
import { semaphoreFor } from '../lib/rules'
import { expiryLabel, formatDate, STATUS_LABEL } from '../lib/format'
import { SemaphoreDot, StatusBadge } from '../components/Semaphore'
import { Spinner } from '../components/common'
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconDoc,
  IconGlobe,
  IconUpload,
  IconUsers,
} from '../components/icons'
import type {
  Business,
  BusinessDocument,
  BusinessProcedure,
  ProcedureStatus,
} from '../lib/types'

const STATUS_OPTIONS: ProcedureStatus[] = ['pendiente', 'en_tramite', 'vigente', 'no_aplica']

export default function ProcedureDetail() {
  const { businessId, code } = useParams()
  const { notify } = useToast()
  const navigate = useNavigate()
  const catalog = code ? getProcedure(code) : undefined

  const [business, setBusiness] = useState<Business | null>(null)
  const [bp, setBp] = useState<BusinessProcedure | null>(null)
  const [docs, setDocs] = useState<BusinessDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Formulario de actualización
  const [status, setStatus] = useState<ProcedureStatus>('pendiente')
  const [emision, setEmision] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (!businessId || !code) return
    ;(async () => {
      const [b, procs, allDocs] = await Promise.all([
        db.getBusiness(businessId),
        db.getBusinessProcedures(businessId),
        db.listDocuments(businessId).catch(() => [] as BusinessDocument[]),
      ])
      setBusiness(b)
      const found = procs.find((p) => p.procedure_code === code) ?? null
      setBp(found)
      setDocs(allDocs.filter((d) => d.procedure_code === code))
      if (found) {
        setStatus(found.status)
        setEmision(found.fecha_emision ?? '')
        setVencimiento(found.fecha_vencimiento ?? '')
      }
      setLoading(false)
    })()
  }, [businessId, code])

  if (loading) return <Spinner label="Cargando trámite…" />
  if (!catalog || !businessId || !code) {
    return <div className="container-app py-16 text-center text-ink-500">Trámite no encontrado.</div>
  }

  const semaphore = bp
    ? semaphoreFor(bp.status, catalog.criticality, bp.fecha_vencimiento)
    : 'naranja'

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId || !code) return
    setSaving(true)
    try {
      // Si hay archivo, súbelo (y asócialo al trámite → status vigente)
      if (file) {
        await db.uploadDocument(businessId, {
          file,
          name: file.name,
          procedure_code: code,
          fecha_emision: emision || null,
          fecha_vencimiento: vencimiento || null,
        })
        // Refresca la lista de documentos del trámite.
        const allDocs = await db.listDocuments(businessId).catch(() => [] as BusinessDocument[])
        setDocs(allDocs.filter((d) => d.procedure_code === code))
        setFile(null)
      }
      const updated = await db.updateBusinessProcedure(businessId, code, {
        status,
        fecha_emision: emision || null,
        fecha_vencimiento: vencimiento || null,
      })
      setBp(updated)
      notify(file ? 'Documento subido y trámite actualizado' : 'Trámite actualizado')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-app py-8 lg:py-10">
      <button
        onClick={() => navigate(`/app?b=${businessId}`)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"
      >
        ← Volver a {business?.nombre ?? 'mis trámites'}
      </button>

      {/* Encabezado */}
      <div className="card overflow-hidden">
        <div className="border-b border-white/10 p-6 text-white" style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="badge bg-white/15 text-white">
                {CATEGORY_LABELS[catalog.category] ?? catalog.category}
                {catalog.criticality === 'alta' && ' · Crítico'}
              </span>
              <h1 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">{catalog.name}</h1>
              <p className="mt-1 text-white/80">{catalog.authority}</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
              <SemaphoreDot color={semaphore} size="lg" />
              <div>
                <div className="text-xs text-brand-100">Estatus</div>
                <div className="font-bold">{bp ? STATUS_LABEL[bp.status] : 'No aplica'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Datos rápidos */}
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/60 p-4">
            <IconClock width={20} height={20} className="text-brand-600" />
            <div>
              <div className="text-xs text-ink-400">Tiempo estimado</div>
              <div className="text-sm font-semibold text-ink-800">{catalog.estimated_time}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/60 p-4">
            <IconDoc width={20} height={20} className="text-brand-600" />
            <div>
              <div className="text-xs text-ink-400">Costo estimado</div>
              <div className="text-sm font-semibold text-ink-800">{catalog.estimated_cost}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/60 p-4">
            <IconAlert width={20} height={20} className="text-brand-600" />
            <div>
              <div className="text-xs text-ink-400">Vigencia</div>
              <div className="text-sm font-semibold text-ink-800">
                {catalog.vigencia_meses ? `${catalog.vigencia_meses} meses` : 'Permanente'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Guía paso a paso */}
        <div className="space-y-6 lg:col-span-2">
          <section className="glass-card p-6 sm:p-7">
            <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4">
              <IconAlert width={20} height={20} className="mt-0.5 flex-none text-brand-600" />
              <div>
                <div className="text-sm font-bold text-brand-800">¿Por qué importa?</div>
                <p className="mt-0.5 text-sm text-brand-900/80">{catalog.why}</p>
              </div>
            </div>

            <h3 className="mt-6 font-display text-lg font-bold text-ink-900">Guía paso a paso</h3>
            <p className="mt-1 text-sm text-ink-500">{catalog.description}</p>
            <ol className="mt-5 space-y-5">
              {catalog.steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    {i < catalog.steps.length - 1 && <span className="mt-1 w-px flex-1 bg-ink-200" />}
                  </div>
                  <div className="pb-1">
                    <div className="text-sm font-bold text-ink-800">{step.title}</div>
                    <p className="mt-0.5 text-sm text-ink-600">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            {catalog.official_url && (
              <a
                href={catalog.official_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary mt-6"
              >
                <IconGlobe width={16} height={16} /> Ver portal oficial
              </a>
            )}
          </section>

          {/* CTA marketplace */}
          <section className="flex flex-col items-start gap-4 rounded-2xl p-6 text-white sm:flex-row sm:items-center sm:justify-between" style={{ backgroundImage: 'linear-gradient(135deg,#20233a,#221a4e)' }}>
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white/10">
                <IconUsers width={24} height={24} />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-white">¿Prefieres que un experto lo haga?</h3>
                <p className="text-sm text-white/70">
                  Contacta profesionales verificados especializados en este trámite.
                </p>
              </div>
            </div>
            <Link
              to={`/marketplace?procedure=${code}`}
              className="btn bg-white px-5 py-2.5 text-brand-700 hover:bg-brand-50"
            >
              Buscar profesional <IconArrowRight width={16} height={16} />
            </Link>
          </section>
        </div>

        {/* Panel de seguimiento */}
        <aside className="lg:col-span-1">
          <form onSubmit={save} className="glass-card sticky top-24 space-y-4 p-6">
            <h3 className="font-display text-base font-bold text-ink-900">Seguimiento del trámite</h3>

            <div>
              <label className="label">Estatus</label>
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProcedureStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Emisión</label>
                <input
                  type="date"
                  className="input"
                  value={emision}
                  onChange={(e) => setEmision(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Vencimiento</label>
                <input
                  type="date"
                  className="input"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(e.target.value)}
                />
              </div>
            </div>

            {vencimiento && (
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <IconClock width={14} height={14} /> {expiryLabel(vencimiento)}
              </div>
            )}

            <div>
              <label className="label">Documento comprobatorio</label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 py-3 text-sm text-ink-500 hover:border-brand-400 hover:text-brand-600">
                <IconUpload width={18} height={18} className="flex-none" />
                <span className="truncate">{file ? file.name : 'Subir archivo (PDF/imagen)'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className="mt-1 text-[11px] text-ink-400">PDF o imagen · el archivo se guarda de forma segura.</p>
            </div>

            <button type="submit" disabled={saving} className="btn-primary w-full">
              <IconCheck width={16} height={16} /> {saving ? 'Guardando…' : 'Guardar seguimiento'}
            </button>

            {bp?.fecha_vencimiento && (
              <div className="rounded-xl bg-white/60 p-3 text-center text-xs text-ink-500">
                Último vencimiento registrado: {formatDate(bp.fecha_vencimiento)}
              </div>
            )}
            <div className="flex justify-center">
              <StatusBadge color={semaphore} status={bp?.status} />
            </div>
          </form>

          {/* Documentos subidos de este trámite */}
          <div className="glass-card mt-4 p-6">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
              <IconDoc width={18} height={18} className="text-brand-600" /> Documentos del trámite
              {docs.length > 0 && (
                <span className="badge bg-ink-100 text-[10px] text-ink-500">{docs.length}</span>
              )}
            </h3>
            {docs.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">
                Aún no has subido documentos para este trámite. Usa el panel de seguimiento para
                adjuntar el comprobante.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {docs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white/60 p-3"
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <IconDoc width={18} height={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink-800">{d.name}</div>
                      <div className="text-xs text-ink-400">
                        {d.fecha_vencimiento
                          ? `Vence ${formatDate(d.fecha_vencimiento)}`
                          : d.fecha_emision
                            ? `Emitido ${formatDate(d.fecha_emision)}`
                            : 'Sin fecha de vigencia'}
                      </div>
                    </div>
                    {d.file_url && (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost flex-none px-3 py-1.5 text-xs"
                      >
                        Ver
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
