import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as db from '../lib/db'
import { formatMoney } from '../lib/format'
import { Spinner } from '../components/common'
import { IconCheck, IconPlus, IconStore } from '../components/icons'
import type { Subscription } from '../lib/types'

export default function CheckoutSuccess() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Damos un instante por si el webhook de Stripe aún está activando el plan.
    db.getSubscription()
      .then(setSub)
      .catch(() => setSub(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Confirmando tu suscripción…" />

  const active = sub && (sub.status === 'active' || sub.status === 'trialing')

  return (
    <div className="container-app flex min-h-[70vh] flex-col items-center justify-center py-12 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-verde text-white shadow-glow">
        <IconCheck width={32} height={32} />
      </span>
      <h1 className="mt-5 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
        {active ? '¡Suscripción activada!' : '¡Gracias por tu compra!'}
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        {active
          ? `Tu plan cubre ${sub?.seats} negocio${sub?.seats === 1 ? '' : 's'}. Ya puedes dar de alta y gestionar el cumplimiento de tus establecimientos.`
          : 'Estamos confirmando tu pago. En unos segundos tu plan quedará activo; puedes recargar esta página.'}
      </p>

      {active && (
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-card">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-500">Negocios cubiertos</span>
            <span className="font-bold text-ink-900">{sub?.seats}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ink-500">Facturación</span>
            <span className="font-bold text-ink-900">
              {sub?.interval === 'annual' ? 'Anual' : 'Mensual'} · {formatMoney((sub?.amount_cents ?? 0) / 100)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/negocio/nuevo" className="btn-primary">
          <IconPlus width={16} height={16} /> Dar de alta un negocio
        </Link>
        <Link to="/app" className="btn-secondary">
          <IconStore width={16} height={16} /> Ir al dashboard
        </Link>
      </div>
    </div>
  )
}
