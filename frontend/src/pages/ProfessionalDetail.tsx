import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as db from '../lib/db'
import { getProcedure } from '../data/catalog'
import { formatDate } from '../lib/format'
import { Spinner, Stars, VerifiedBadge } from '../components/common'
import { ReviewList, StarInput, StarRow } from '../components/Reviews'
import {
  IconArrowRight,
  IconBadgeCheck,
  IconCheck,
  IconGlobe,
  IconMapPin,
  IconPhone,
  IconStar,
} from '../components/icons'
import type {
  Business,
  Certification,
  ContactRequest,
  Professional,
  Review,
} from '../lib/types'

export default function ProfessionalDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [pro, setPro] = useState<Professional | null>(null)
  const [certs, setCerts] = useState<Certification[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [myRequests, setMyRequests] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [businessId, setBusinessId] = useState('')
  const [procCode, setProcCode] = useState(params.get('procedure') ?? '')
  const [message, setMessage] = useState('')

  // Evaluación
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const [p, c, rev] = await Promise.all([
        db.getProfessional(id),
        db.listCertifications(id),
        db.listReviews(id),
      ])
      setPro(p)
      setCerts(c)
      setReviews(rev)
      if (profile?.role === 'business_owner') {
        const [list, reqs] = await Promise.all([
          db.listBusinesses(profile.id),
          db.listContactRequests(profile.id),
        ])
        setBusinesses(list)
        setMyRequests(reqs)
        if (list[0]) setBusinessId(list[0].id)
      }
      setLoading(false)
    })()
  }, [id, profile])

  if (loading) return <Spinner label="Cargando profesional…" />
  if (!pro) return <div className="container-app py-16 text-center text-ink-500">Profesional no encontrado.</div>

  async function contact(e: React.FormEvent) {
    e.preventDefault()
    if (!pro) return
    setSending(true)
    try {
      await db.createContactRequest({
        business_id: businessId || null,
        professional_id: pro.id,
        requester_id: profile?.id ?? null,
        procedure_code: procCode || null,
        message: message || `Hola, me interesa tu apoyo con un trámite. ¿Podemos platicar?`,
      })
      notify('Solicitud enviada al profesional ✅')
      setMessage('')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al enviar', 'error')
    } finally {
      setSending(false)
    }
  }

  // ¿Puede evaluar? Solo si cerró un trabajo con este profesional y no lo ha evaluado.
  const hasCompletedEngagement = myRequests.some(
    (r) => r.professional_id === pro.id && r.status === 'cerrado',
  )
  const alreadyReviewed = reviews.some((r) => !!profile && r.requester_id === profile.id)
  const canReview =
    profile?.role === 'business_owner' && hasCompletedEngagement && !alreadyReviewed

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!pro) return
    setSubmittingReview(true)
    try {
      const rev = await db.createReview(pro.id, {
        rating,
        comment: reviewComment || undefined,
        business_id: businessId || null,
      })
      setReviews((prev) => [rev, ...prev])
      const updated = await db.getProfessional(pro.id)
      if (updated) setPro(updated)
      notify('¡Gracias por tu evaluación! ⭐')
      setReviewComment('')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo enviar la evaluación', 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="container-app py-8 lg:py-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"
      >
        ← Volver al marketplace
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Perfil */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card p-6">
            <div className="flex flex-wrap items-start gap-4">
              {pro.avatar_url ? (
                <img
                  src={pro.avatar_url}
                  alt={pro.nombre}
                  className="h-20 w-20 flex-none rounded-2xl object-cover shadow-sm ring-1 ring-white/70"
                />
              ) : (
                <span
                  className="grid h-20 w-20 flex-none place-items-center rounded-2xl text-2xl font-extrabold text-white"
                  style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}
                >
                  {pro.nombre.slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl font-extrabold text-ink-900">{pro.nombre}</h1>
                  <VerifiedBadge verified={pro.verified} />
                </div>
                <p className="mt-0.5 text-ink-500">{pro.profesion}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-ink-500">
                  <Stars rating={pro.rating} />
                  <span>{pro.reviews_count} reseñas</span>
                  {pro.cedula && <span>Cédula/registro: {pro.cedula}</span>}
                </div>
              </div>
            </div>

            <p className="mt-5 text-ink-600">{pro.bio}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-ink-600">
                <IconMapPin width={16} height={16} className="text-brand-600" />
                {pro.alcaldias.join(', ')}
              </div>
              {pro.telefono && (
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <IconPhone width={16} height={16} className="text-brand-600" />
                  {pro.telefono}
                </div>
              )}
              {pro.sitio_web && (
                <a
                  href={pro.sitio_web}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-brand-600 hover:underline"
                >
                  <IconGlobe width={16} height={16} /> Sitio web
                </a>
              )}
            </div>

            <div className="mt-6">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-400">Especialidades</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pro.especialidades.map((e) => (
                  <span key={e} className="badge bg-brand-50 text-brand-700">
                    {e}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-400">
                Trámites que resuelve
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pro.procedures_codes.map((code) => (
                  <span key={code} className="badge bg-ink-100 text-ink-600">
                    {getProcedure(code)?.name ?? code}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Certificaciones */}
          <div className="glass-card p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
              <IconBadgeCheck width={20} height={20} className="text-brand-600" /> Certificaciones
            </h2>
            {certs.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">Este profesional aún no ha subido certificaciones.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {certs.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/60 p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-ink-800">
                        {c.nombre}
                        {c.verified && (
                          <IconCheck width={14} height={14} className="text-verde" />
                        )}
                      </div>
                      <div className="text-xs text-ink-500">{c.emisor}</div>
                    </div>
                    <div className="text-right text-xs text-ink-400">
                      {c.fecha_vencimiento ? `Vence ${formatDate(c.fecha_vencimiento)}` : 'Sin vencimiento'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Evaluaciones */}
          <div className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                <IconStar width={20} height={20} className="text-amber-400" /> Evaluaciones
              </h2>
              <div className="flex items-center gap-2">
                <StarRow rating={pro.rating} />
                <span className="text-sm font-bold text-ink-800">{pro.rating.toFixed(1)}</span>
                <span className="text-sm text-ink-400">({pro.reviews_count})</span>
              </div>
            </div>

            {/* Formulario de evaluación (solo si cerró un trabajo con él) */}
            {canReview && (
              <form
                onSubmit={submitReview}
                className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4"
              >
                <div className="text-sm font-semibold text-ink-800">Deja tu evaluación</div>
                <p className="mt-0.5 text-xs text-ink-500">
                  Tuviste un trabajo cerrado con este profesional. Tu opinión ayuda a otros negocios.
                </p>
                <div className="mt-3">
                  <StarInput value={rating} onChange={setRating} />
                </div>
                <textarea
                  className="input mt-3 min-h-[80px]"
                  placeholder="¿Cómo fue tu experiencia? (opcional)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-primary mt-3 w-full sm:w-auto"
                >
                  {submittingReview ? 'Enviando…' : 'Publicar evaluación'}
                </button>
              </form>
            )}
            {profile?.role === 'business_owner' && !hasCompletedEngagement && (
              <p className="mt-3 rounded-xl bg-ink-50 px-4 py-3 text-xs text-ink-500">
                Podrás evaluar a este profesional cuando marques como <strong>cerrado</strong> un
                trabajo con él desde <span className="font-semibold">Mi cuenta → Conexiones</span>.
              </p>
            )}
            {alreadyReviewed && (
              <p className="mt-3 text-xs font-medium text-verde-dark">
                ✓ Ya evaluaste a este profesional. ¡Gracias!
              </p>
            )}

            <ReviewList reviews={reviews} />
          </div>
        </div>

        {/* Contacto */}
        <aside className="lg:col-span-1">
          <form onSubmit={contact} className="glass-card sticky top-24 space-y-4 p-6">
            <h3 className="font-display text-base font-bold text-ink-900">Contactar profesional</h3>

            {businesses.length > 0 && (
              <div>
                <label className="label">Negocio</label>
                <select className="select" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">Trámite</label>
              <select className="select" value={procCode} onChange={(e) => setProcCode(e.target.value)}>
                <option value="">General / varios</option>
                {pro.procedures_codes.map((code) => (
                  <option key={code} value={code}>
                    {getProcedure(code)?.name ?? code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Mensaje</label>
              <textarea
                className="input min-h-[110px]"
                placeholder="Cuéntale a qué trámite necesitas apoyo…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <button type="submit" disabled={sending} className="btn-primary w-full">
              {sending ? 'Enviando…' : 'Enviar solicitud'} <IconArrowRight width={16} height={16} />
            </button>
            <p className="text-center text-xs text-ink-400">
              El profesional recibirá tu solicitud y tus datos de contacto.
            </p>
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-center text-[11px] text-ink-500">
              El pago del servicio se acuerda <strong>directamente</strong> con el profesional; no
              pasa por la plataforma.
            </p>
          </form>
        </aside>
      </div>
    </div>
  )
}
