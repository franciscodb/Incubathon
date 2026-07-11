import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as db from '../lib/db'
import { useToast } from '../context/ToastContext'
import {
  ALCOHOL_SURCHARGE,
  computeQuote,
  FREE_SEATS,
  VOLUME_BANDS,
  type BillingInterval,
} from '../lib/pricing'
import { formatMoney } from '../lib/format'
import { SectionTitle, Spinner } from '../components/common'
import { IconAlert, IconArrowRight, IconCheck, IconShield, IconSparkles } from '../components/icons'
import type { Subscription } from '../lib/types'

const ACTIVE = new Set(['active', 'trialing'])

function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  hint,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>}
      </span>
      <span className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-lg font-bold text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
          aria-label={`Disminuir ${label}`}
        >
          −
        </button>
        <span className="w-8 text-center font-display text-lg font-extrabold text-ink-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-lg font-bold text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
          aria-label={`Aumentar ${label}`}
        >
          +
        </button>
      </span>
    </div>
  )
}

export default function Pricing() {
  const { notify } = useToast()
  const [params] = useSearchParams()
  const limitReason = params.get('motivo') === 'limite'

  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [businesses, setBusinesses] = useState(1)
  const [alcohol, setAlcohol] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    db.getSubscription()
      .then((s) => {
        setSub(s)
        // Prefill: al menos lo ya usado (o el plan actual).
        const start = Math.max(s.used_seats || 0, s.seats || 0, 1)
        setBusinesses(start)
        setAlcohol(Math.min(s.alcohol_businesses || 0, start))
      })
      .catch(() => setSub(null))
      .finally(() => setLoading(false))
  }, [])

  const quote = useMemo(
    () => computeQuote(businesses, alcohol, interval),
    [businesses, alcohol, interval],
  )

  async function subscribe() {
    setSubmitting(true)
    try {
      const res = await db.createCheckout({
        businesses,
        alcohol_businesses: alcohol,
        interval,
      })
      if (res.simulated) {
        // Demo sin Stripe: la suscripción ya quedó activa en el backend.
        window.location.assign('/precios/exito?simulated=1')
      } else {
        // Stripe real: redirige a Checkout.
        window.location.href = res.url
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo iniciar el pago', 'error')
      setSubmitting(false)
    }
  }

  if (loading) return <Spinner label="Cargando planes…" />

  const isActive = sub ? ACTIVE.has(sub.status) : false

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-mesh-twilight" />
      <div className="container-app relative py-8 lg:py-12">
        <SectionTitle
          eyebrow="Planes y precios"
          title="Paga solo por los negocios que gestionas"
          description="El precio por negocio baja conforme creces, y cada negocio que vende alcohol suma un pequeño recargo (implica más trámites). Sin comisiones por contratar profesionales."
        />

        {limitReason && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amarillo/40 bg-amarillo-light/60 px-5 py-3.5 text-amarillo-dark">
            <IconAlert width={20} height={20} className="mt-0.5 flex-none" />
            <span className="text-sm font-medium">
              Alcanzaste el límite de negocios de tu plan actual. Amplía tu suscripción para dar de
              alta más negocios.
            </span>
          </div>
        )}

        {/* Estado del plan actual */}
        {sub && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
                <IconShield width={20} height={20} />
              </span>
              <div>
                <div className="text-sm font-bold text-ink-900">
                  {isActive ? 'Plan activo' : 'Plan gratuito'}
                  <span className="ml-2 font-normal text-ink-500">
                    {sub.used_seats} / {sub.entitled_seats} negocios usados
                  </span>
                </div>
                <div className="text-xs text-ink-500">
                  {isActive
                    ? `Cubre ${sub.seats} negocio${sub.seats === 1 ? '' : 's'}${
                        sub.current_period_end
                          ? ` · renueva el ${new Date(sub.current_period_end).toLocaleDateString('es-MX', { day: '2-digit', month: 'long' })}`
                          : ''
                      }`
                    : `Incluye ${FREE_SEATS} negocio gratis. Suscríbete para registrar más.`}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Columna informativa: cómo funciona + bandas de precio */}
          <div className="space-y-5 lg:col-span-3">
            <div className="glass-card p-6">
              <h3 className="font-display text-base font-bold text-ink-900">Precio por negocio (por volumen)</h3>
              <p className="mt-1 text-sm text-ink-500">
                Entre más negocios gestionas, menor es el precio unitario mensual.
              </p>
              <div className="mt-4 space-y-2.5">
                {VOLUME_BANDS.map((b, i) => {
                  const active = businesses >= b.min && (i === VOLUME_BANDS.length - 1 || businesses < VOLUME_BANDS[i + 1].min)
                  return (
                    <div
                      key={b.min}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                        active ? 'border-brand-300 bg-brand-50/70' : 'border-ink-100 bg-white'
                      }`}
                    >
                      <span className="text-sm font-semibold text-ink-700">{b.label}</span>
                      <span className="font-display text-lg font-extrabold text-ink-900">
                        {formatMoney(b.unit)}
                        <span className="text-xs font-medium text-ink-400"> /negocio · mes</span>
                      </span>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between rounded-xl border border-naranja/30 bg-naranja-light/50 px-4 py-3">
                  <span className="text-sm font-semibold text-naranja-dark">
                    Recargo por venta de alcohol
                  </span>
                  <span className="font-display text-lg font-extrabold text-naranja-dark">
                    +{formatMoney(ALCOHOL_SURCHARGE)}
                    <span className="text-xs font-medium"> /negocio · mes</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display text-base font-bold text-ink-900">Todo incluido</h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  'Diagnóstico y matriz de cumplimiento por negocio',
                  'Clasificación crediticia (AAA…C) y semáforo',
                  'Alertas de vencimiento de trámites',
                  'Gestión y resguardo de documentos',
                  'Acceso al marketplace de profesionales verificados',
                  'Guías paso a paso por trámite',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-600">
                    <IconCheck width={16} height={16} className="mt-0.5 flex-none text-verde" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-xs text-ink-500">
                Los pagos por servicios entre negocios y profesionales se acuerdan directamente entre
                las partes y <strong>no pasan por la plataforma</strong>. Aquí solo cobramos tu
                suscripción.
              </p>
            </div>
          </div>

          {/* Calculadora + checkout */}
          <div className="lg:col-span-2">
            <div className="glass-card sticky top-24 overflow-hidden">
              <div
                className="flex items-center gap-2 px-5 py-3.5 text-white"
                style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}
              >
                <IconSparkles width={18} height={18} />
                <span className="font-display text-sm font-bold">Arma tu plan</span>
              </div>

              <div className="space-y-4 p-5">
                {/* Toggle mensual/anual */}
                <div className="inline-flex w-full rounded-xl border border-ink-200 bg-white p-0.5">
                  {(['monthly', 'annual'] as BillingInterval[]).map((iv) => (
                    <button
                      key={iv}
                      onClick={() => setInterval(iv)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        interval === iv ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:text-ink-700'
                      }`}
                    >
                      {iv === 'monthly' ? 'Mensual' : 'Anual'}
                      {iv === 'annual' && (
                        <span className="ml-1 rounded-full bg-verde-light px-1.5 py-0.5 text-[10px] font-bold text-verde-dark">
                          2 meses gratis
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <Stepper
                  label="¿Cuántos negocios?"
                  hint="Total que quieres gestionar"
                  value={businesses}
                  min={1}
                  max={50}
                  onChange={(v) => {
                    setBusinesses(v)
                    if (alcohol > v) setAlcohol(v)
                  }}
                />
                <Stepper
                  label="¿Cuántos venden alcohol?"
                  hint="Suman recargo por negocio"
                  value={alcohol}
                  min={0}
                  max={businesses}
                  onChange={setAlcohol}
                />

                {/* Desglose */}
                <div className="space-y-1.5 rounded-xl bg-ink-50 p-4 text-sm">
                  <div className="flex justify-between text-ink-600">
                    <span>
                      {businesses} × {formatMoney(quote.unit_price)}
                    </span>
                    <span>{formatMoney(quote.base_subtotal)}</span>
                  </div>
                  {quote.alcohol_surcharge > 0 && (
                    <div className="flex justify-between text-ink-600">
                      <span>
                        {alcohol} × alcohol ({formatMoney(ALCOHOL_SURCHARGE)})
                      </span>
                      <span>{formatMoney(quote.alcohol_surcharge)}</span>
                    </div>
                  )}
                  <div className="mt-1 flex items-baseline justify-between border-t border-ink-200 pt-2">
                    <span className="font-semibold text-ink-800">
                      Total {interval === 'annual' ? '/ año' : '/ mes'}
                    </span>
                    <span className="font-display text-2xl font-extrabold text-gradient">
                      {formatMoney(quote.billed_total)}
                    </span>
                  </div>
                  {interval === 'annual' && (
                    <div className="flex justify-between text-xs text-verde-dark">
                      <span>≈ {formatMoney(quote.monthly_equivalent)} /mes</span>
                      <span>Ahorras {formatMoney(quote.annual_savings)}/año</span>
                    </div>
                  )}
                </div>

                <button onClick={subscribe} disabled={submitting} className="btn-primary w-full py-3.5">
                  {submitting ? 'Redirigiendo…' : isActive ? 'Actualizar mi plan' : 'Suscribirme'}
                  <IconArrowRight width={16} height={16} />
                </button>
                <p className="text-center text-xs text-ink-400">
                  Pago seguro con Stripe · cancela cuando quieras
                </p>
                <Link
                  to="/app"
                  className="block text-center text-xs font-semibold text-brand-600 hover:underline"
                >
                  Volver al dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
