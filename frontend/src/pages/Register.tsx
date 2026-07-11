import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getToken } from '../lib/api'
import { Logo } from '../components/common'
import { IconArrowRight, IconBadgeCheck, IconStore, IconUsers } from '../components/icons'
import authImg from '../assets/generated/cafe.jpg'

type Role = 'business_owner' | 'professional'

export default function Register() {
  const { register } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('business_owner')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      notify('La contraseña debe tener al menos 6 caracteres.', 'error')
      return
    }
    setLoading(true)
    try {
      await register({ email, password, full_name: fullName, role })
      notify('Cuenta creada 🎉')
      // Si el proyecto exige confirmar correo, no hay sesión todavía.
      if (!getToken()) {
        notify('Revisa tu correo para confirmar la cuenta e inicia sesión.', 'info')
        navigate('/login')
        return
      }
      navigate(role === 'professional' ? '/pro/perfil' : '/negocio/nuevo')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo registrar', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel lateral con imagen */}
      <div className="relative hidden overflow-hidden lg:block">
        <img src={authImg} alt="Café en CDMX" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/92 via-ink-950/55 to-brand-950/50" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white [text-shadow:0_2px_20px_rgb(0_0_0_/_0.5)]">
          <Logo compact onDark />
          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight text-white">
              Cumplir deja de ser un dolor de cabeza.
            </h2>
            <ul className="mt-6 space-y-3 text-white/85">
              {['Diagnóstico determinístico en minutos', 'Semáforo y alertas de vencimiento', 'Profesionales verificados a un clic'].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <IconBadgeCheck width={18} height={18} className="text-accent-300" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-white/60">© {new Date().getFullYear()} CumplIA · CDMX</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="relative flex items-center justify-center bg-ink-50 bg-mesh-twilight px-6 py-12">
        <div className="w-full max-w-md glass-card p-8">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-ink-500">Empieza a diagnosticar y gestionar tu cumplimiento.</p>

          {/* Selector de rol */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('business_owner')}
              className={`rounded-xl border-2 p-4 text-left transition ${
                role === 'business_owner'
                  ? 'border-brand-400 bg-brand-50/70'
                  : 'border-ink-200 bg-white/60 hover:border-ink-300'
              }`}
            >
              <IconStore
                width={22}
                height={22}
                className={role === 'business_owner' ? 'text-brand-600' : 'text-ink-400'}
              />
              <div className="mt-2 text-sm font-bold text-ink-800">Dueño de negocio</div>
              <div className="text-xs text-ink-500">Diagnostico y gestiono trámites</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('professional')}
              className={`rounded-xl border-2 p-4 text-left transition ${
                role === 'professional'
                  ? 'border-brand-400 bg-brand-50/70'
                  : 'border-ink-200 bg-white/60 hover:border-ink-300'
              }`}
            >
              <IconUsers
                width={22}
                height={22}
                className={role === 'professional' ? 'text-brand-600' : 'text-ink-400'}
              />
              <div className="mt-2 text-sm font-bold text-ink-800">Profesional</div>
              <div className="text-xs text-ink-500">Ofrezco servicios de trámites</div>
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">{role === 'professional' ? 'Nombre / Razón social' : 'Nombre completo'}</label>
              <input
                required
                className="input"
                placeholder="Ej. Ana Torres"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
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
                minLength={6}
                className="input"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Creando cuenta…' : 'Crear cuenta'} <IconArrowRight width={16} height={16} />
            </button>
            <p className="text-center text-xs text-ink-400">
              Al crear tu cuenta aceptas los{' '}
              <Link to="/terminos" className="font-semibold text-brand-600 hover:underline">
                Términos
              </Link>{' '}
              y el{' '}
              <Link to="/privacidad" className="font-semibold text-brand-600 hover:underline">
                Aviso de Privacidad
              </Link>
              .
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
