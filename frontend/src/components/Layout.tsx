import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo } from './common'
import { IconLogout, IconMenu, IconStore, IconUsers } from './icons'

function DemoBanner() {
  const { backendMode } = useAuth()
  if (backendMode !== 'mock') return null
  return (
    <div className="bg-accent-500 text-center text-xs font-semibold text-white">
      <div className="container-app py-1.5">
        🧪 Modo demostración — el backend corre con datos en memoria. Configura Supabase
        (USE_MOCK=false) para producción.
      </div>
    </div>
  )
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800'
  }`

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className="grid h-9 w-9 flex-none place-items-center rounded-full text-xs font-bold text-white shadow-glow"
      style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}
    >
      {initials || 'U'}
    </span>
  )
}

export default function Layout() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const isPro = profile?.role === 'professional'

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const navLinks = isPro ? (
    <>
      <NavLink to="/pro/perfil" className={linkClass}>
        Mi perfil profesional
      </NavLink>
      <NavLink to="/marketplace" className={linkClass}>
        Marketplace
      </NavLink>
    </>
  ) : (
    <>
      <NavLink to="/app" end className={linkClass}>
        Dashboard
      </NavLink>
      <NavLink to="/marketplace" className={linkClass}>
        Profesionales
      </NavLink>
      <NavLink to="/precios" className={linkClass}>
        Planes
      </NavLink>
      <NavLink to="/perfil" className={linkClass}>
        Mi cuenta
      </NavLink>
    </>
  )

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <DemoBanner />
      <header className="glass sticky top-0 z-40 border-b border-white/50">
        <div className="container-app flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">{navLinks}</nav>
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-2.5 rounded-full border border-white/60 bg-white/50 py-1 pl-1 pr-3">
              <Avatar name={profile?.full_name || 'Usuario'} />
              <div className="leading-tight">
                <div className="text-sm font-semibold text-ink-800">
                  {profile?.full_name || 'Usuario'}
                </div>
                <div className="text-[11px] capitalize text-ink-400">
                  {isPro ? 'Profesional' : 'Dueño de negocio'}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-ghost" title="Cerrar sesión">
              <IconLogout width={18} height={18} />
            </button>
          </div>
          <button className="btn-ghost md:hidden" onClick={() => setOpen((o) => !o)}>
            <IconMenu />
          </button>
        </div>
        {open && (
          <div className="glass border-t border-white/40 md:hidden">
            <nav className="container-app flex flex-col gap-1 py-3" onClick={() => setOpen(false)}>
              {navLinks}
              <button onClick={handleLogout} className="btn-ghost mt-1 justify-start">
                <IconLogout width={18} height={18} /> Cerrar sesión
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 animate-fade-in">
        <Outlet />
      </main>

      <footer className="border-t border-ink-100 bg-white">
        <div className="container-app flex flex-col items-center justify-between gap-3 py-6 text-sm text-ink-400 sm:flex-row">
          <Logo compact />
          <p>© {new Date().getFullYear()} CumplIA · Cumplimiento regulatorio · MVP CDMX</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/marketplace" className="inline-flex items-center gap-1.5 hover:text-brand-600">
              <IconUsers width={16} height={16} /> Profesionales
            </Link>
            <Link to="/app" className="inline-flex items-center gap-1.5 hover:text-brand-600">
              <IconStore width={16} height={16} /> Mis negocios
            </Link>
            <Link to="/privacidad" className="hover:text-brand-600">
              Privacidad
            </Link>
            <Link to="/terminos" className="hover:text-brand-600">
              Términos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
