import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Logo } from '../components/common'
import { IconArrowRight, IconSparkles } from '../components/icons'
import type { Profile } from '../lib/types'
import authImg from '../assets/generated/terraza.jpg'

function destFor(p: Profile) {
  return p.role === 'professional' ? '/pro/perfil' : '/app'
}

export default function Login() {
  const { login, loginDemo, backendMode } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const p = await login({ email, password })
      notify(`Bienvenido, ${p.full_name || p.email}`)
      navigate(destFor(p))
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo iniciar sesión', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function demo() {
    setLoading(true)
    try {
      const p = await loginDemo()
      notify('Sesión demo iniciada')
      navigate(destFor(p))
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel lateral con imagen */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src={authImg} alt="Restaurante en CDMX" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/92 via-ink-950/60 to-brand-950/50" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white [text-shadow:0_2px_20px_rgb(0_0_0_/_0.5)]">
          <Logo compact onDark />
          <div>
            <span className="badge-glass mb-5 text-white">
              <IconSparkles width={14} height={14} className="text-accent-300" /> RegTech · CDMX
            </span>
            <h2 className="font-display text-3xl font-extrabold leading-tight text-white">
              El sistema operativo del cumplimiento de tu negocio.
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              Diagnóstico, matriz de trámites con semáforo, alertas de vencimiento y profesionales
              verificados — todo en un solo lugar.
            </p>
          </div>
          <p className="text-sm text-white/60">© {new Date().getFullYear()} CumplIA · CDMX</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="relative flex items-center justify-center bg-ink-50 bg-mesh-twilight px-6 py-12">
        <div className="w-full max-w-sm glass-card p-8">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Inicia sesión</h1>
          <p className="mt-1 text-sm text-ink-500">Accede al panel de cumplimiento de tus negocios.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                required
                className="input"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Entrando…' : 'Iniciar sesión'} <IconArrowRight width={16} height={16} />
            </button>
          </form>

          {backendMode === 'mock' && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" /> o prueba el demo{' '}
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <button onClick={demo} disabled={loading} className="btn-secondary w-full py-3">
                🧪 Entrar como negocio demo
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Demo: <code className="rounded bg-slate-100 px-1">demo@buro.mx</code> ·{' '}
                <code className="rounded bg-slate-100 px-1">demo1234</code> — o{' '}
                <code className="rounded bg-slate-100 px-1">pro@buro.mx</code> (profesional)
              </p>
            </>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-semibold text-brand-600 hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
