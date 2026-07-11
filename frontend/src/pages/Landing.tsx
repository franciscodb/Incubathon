import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/common'
import { SemaphoreDot } from '../components/Semaphore'
import {
  IconAlert,
  IconArrowRight,
  IconBadgeCheck,
  IconCheck,
  IconClock,
  IconDoc,
  IconSparkles,
  IconUsers,
} from '../components/icons'
import heroCity from '../assets/generated/hero-city.jpg'
import cafeImg from '../assets/generated/cafe.jpg'

const STATS = [
  { value: '+6M', label: 'establecimientos en México (DENUE/INEGI)' },
  { value: '~10K', label: 'quejas ciudadanas al INVEA en 2025' },
  { value: '+2,500', label: 'negocios regularizados por el INVEA en CDMX' },
  { value: '14+', label: 'trámites distintos para un restaurante' },
]

const SEMAFORO = [
  { color: 'verde', title: 'Verde', desc: 'Cumplimiento adecuado.' },
  { color: 'amarillo', title: 'Amarillo', desc: 'Documentos próximos a vencer.' },
  { color: 'naranja', title: 'Naranja', desc: 'Trámites pendientes o riesgos.' },
  { color: 'rojo', title: 'Rojo', desc: 'Incumplimientos graves.' },
] as const

const PREGUNTAS = [
  '¿Qué obligaciones debe cumplir este negocio?',
  '¿Qué documentos tiene actualmente?',
  '¿Qué le falta o está por vencer?',
  '¿Cuál es su nivel de riesgo regulatorio?',
  '¿Qué debe hacer para cumplir y mantenerse?',
]

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

export default function Landing() {
  const { profile } = useAuth()
  const scrolled = useScrolled()
  const primaryHref = profile
    ? profile.role === 'professional'
      ? '/pro/perfil'
      : '/app'
    : '/registro'

  return (
    <div className="min-h-screen bg-ink-50">
      {/* ============ NAV ============ */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass border-b border-white/40 py-1' : 'border-b border-transparent py-2'
        }`}
      >
        <div className="container-app flex h-14 items-center justify-between">
          <Logo onDark={!scrolled} />
          <div className="flex items-center gap-2">
            {profile ? (
              <Link to={primaryHref} className="btn-primary">
                Ir a mi panel <IconArrowRight width={16} height={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`btn-ghost ${scrolled ? '' : 'text-white hover:bg-white/10'}`}
                >
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-primary">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden">
        <img
          src={heroCity}
          alt="Ciudad de México al atardecer"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Overlays para legibilidad + tinte de marca */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/92 via-ink-950/60 to-ink-950/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/82 via-ink-950/25 to-brand-950/30" />

        <div className="container-app relative z-10 grid gap-12 pt-28 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Copy */}
          <div className="animate-fade-up [&_p]:[text-shadow:0_1px_18px_rgb(11_13_26_/_0.45)]">
            <span className="badge-glass text-white">
              <IconSparkles width={14} height={14} className="text-accent-300" />
              RegTech para Alimentos y Bebidas · CDMX
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              El <span className="text-white">Buró de Crédito</span>
              <br />
              del cumplimiento de tu negocio.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Descubre en minutos qué permisos necesita tu restaurante, bar o café en la Ciudad de
              México, gestiona sus vigencias con un semáforo claro y conéctate con profesionales
              verificados. Más humano que los portales oficiales.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to={primaryHref} className="btn-primary px-6 py-3.5 text-base">
                Diagnostica gratis mi negocio <IconArrowRight width={18} height={18} />
              </Link>
              <Link to="/marketplace" className="btn-glass px-6 py-3.5 text-base text-white">
                <IconUsers width={18} height={18} /> Ver profesionales
              </Link>
            </div>
            <div className="mt-7 flex items-center gap-2 text-sm text-white/70">
              <IconBadgeCheck width={16} height={16} className="text-accent-300" />
              Sin tarjeta · Diagnóstico determinístico en 2 minutos
            </div>
          </div>

          {/* Tarjeta de semáforo flotante (vidrio) */}
          <div className="animate-fade-in lg:justify-self-end">
            <div
              className="glass-card w-full max-w-md overflow-hidden p-0 lg:animate-float"
              style={{ background: 'rgba(255,255,255,0.86)' }}
            >
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                <div>
                  <div className="font-display text-sm font-bold text-ink-900">La Terraza Roma</div>
                  <div className="text-xs text-ink-500">Restaurante · Cuauhtémoc</div>
                </div>
                <span className="badge bg-naranja-light text-naranja-dark">Impacto vecinal</span>
              </div>
              <div className="divide-y divide-ink-100">
                {[
                  { n: 'Aviso Sanitario COFEPRIS', c: 'verde', s: 'Vigente' },
                  { n: 'Protección Civil (PIPC)', c: 'amarillo', s: 'Vence en 25 días' },
                  { n: 'Permiso de alcohol', c: 'rojo', s: 'Vencido' },
                  { n: 'Autorización de terraza', c: 'naranja', s: 'Pendiente' },
                ].map((r) => (
                  <div key={r.n} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <SemaphoreDot color={r.c as never} pulse />
                      <span className="text-sm font-medium text-ink-800">{r.n}</span>
                    </div>
                    <span className="text-xs font-semibold text-ink-500">{r.s}</span>
                  </div>
                ))}
              </div>
              <div
                className="flex items-center justify-between px-5 py-4 text-white"
                style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}
              >
                <span className="text-sm font-medium">Cumplimiento del negocio</span>
                <span className="font-display text-xl font-extrabold">43%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Difuminado de transición al fondo claro */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-50 to-transparent" />
      </section>

      {/* ============ STATS ============ */}
      <section className="relative bg-ink-50">
        <div className="container-app -mt-12 pb-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="glass-card p-6 text-center animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="font-display text-3xl font-extrabold text-brand-600">{s.value}</div>
                <div className="mt-2 text-xs leading-snug text-ink-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROBLEMA ============ */}
      <section className="border-y border-ink-100 bg-white">
        <div className="container-app py-24 text-center sm:py-32">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-600">El problema</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Cumplir es caro, confuso y arriesgado
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-600">
            Los requisitos cambian según giro, ubicación, superficie, aforo, alcohol, gas, ruido,
            anuncios y terraza. Un solo trámite olvidado puede significar una clausura.
          </p>
        </div>
      </section>

      {/* ============ SOLUCIÓN: 5 preguntas + semáforo ============ */}
      <section className="relative overflow-hidden bg-ink-50 bg-mesh-twilight">
        <div className="container-app grid gap-14 py-24 sm:py-32 lg:grid-cols-2 lg:items-center">
          <div className="animate-fade-up">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">La solución</p>
            <h2 className="mt-3 text-3xl font-extrabold text-ink-900 sm:text-4xl">
              Respondemos 5 preguntas por cada negocio
            </h2>
            <p className="mt-4 text-ink-600">
              Nuestro motor de reglas transforma las características de tu negocio en obligaciones
              concretas, trazables y verificables. Sin ambigüedad.
            </p>
            <ul className="mt-8 space-y-3">
              {PREGUNTAS.map((q, i) => (
                <li
                  key={q}
                  className="glass-card flex items-start gap-3 px-4 py-3.5 animate-fade-up"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span
                    className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-ink-700">{q}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-8 animate-fade-in">
            <h3 className="font-display text-lg font-bold text-ink-900">Semáforo de cumplimiento</h3>
            <p className="mt-1 text-sm text-ink-500">
              Un color por negocio y por trámite. Sabes de un vistazo qué atender primero.
            </p>
            <div className="mt-6 space-y-3">
              {SEMAFORO.map((s) => (
                <div
                  key={s.color}
                  className="flex items-center gap-4 rounded-xl border border-white/50 bg-white/50 p-3.5"
                >
                  <SemaphoreDot color={s.color} size="lg" />
                  <div>
                    <div className="text-sm font-bold text-ink-800">{s.title}</div>
                    <div className="text-xs text-ink-500">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CÓMO FUNCIONA ============ */}
      <section className="border-t border-ink-100 bg-white">
        <div className="container-app py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-600">Cómo funciona</p>
            <h2 className="mt-3 text-3xl font-extrabold text-ink-900 sm:text-4xl">
              De la incertidumbre a la tranquilidad, en 3 pasos
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: <IconDoc width={22} height={22} />,
                title: 'Diagnostica',
                desc: 'Llena el cuestionario de datos generales y clasificamos tu negocio automáticamente.',
              },
              {
                icon: <IconClock width={22} height={22} />,
                title: 'Gestiona',
                desc: 'Recibe tu matriz de trámites con estatus, vigencias y alertas de vencimiento.',
              },
              {
                icon: <IconUsers width={22} height={22} />,
                title: 'Resuelve',
                desc: 'Sigue la guía paso a paso o contrata a un profesional verificado del marketplace.',
              },
            ].map((c, i) => (
              <div key={c.title} className="card card-hover p-7">
                <div
                  className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-glow"
                  style={{ backgroundImage: 'linear-gradient(135deg,#6d5efc,#4d38d4)' }}
                >
                  {c.icon}
                </div>
                <div className="mt-4 text-xs font-bold text-brand-500">PASO {i + 1}</div>
                <h3 className="mt-1 font-display text-lg font-bold text-ink-900">{c.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MARKETPLACE TEASER ============ */}
      <section className="bg-ink-50">
        <div className="container-app py-24 sm:py-32">
          <div className="overflow-hidden rounded-4xl border border-ink-100 bg-white shadow-card lg:grid lg:grid-cols-2">
            <div className="relative min-h-[280px]">
              <img src={cafeImg} alt="Negocio local en CDMX" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/40 to-transparent" />
            </div>
            <div className="p-8 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Marketplace</p>
              <h2 className="mt-3 text-2xl font-extrabold text-ink-900 sm:text-3xl">
                Profesionales verificados que sí resuelven
              </h2>
              <p className="mt-4 text-ink-600">
                DROs, terceros acreditados, unidades de verificación de gas, abogados regulatorios y
                laboratorios — conectados directamente al trámite que necesitas cerrar.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/marketplace" className="btn-primary px-6 py-3">
                  Explorar el marketplace <IconArrowRight width={18} height={18} />
                </Link>
                <span className="badge-glass">
                  <IconBadgeCheck width={14} height={14} className="text-brand-600" /> Credenciales verificadas
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="container-app pb-24 sm:pb-32">
        <div className="relative overflow-hidden rounded-4xl px-8 py-20 text-center text-white">
          {/* Fondo de alto contraste: gradiente sólido + imagen apenas como textura */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-ink-950 to-brand-950" />
          <img src={heroCity} alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.18] mix-blend-luminosity" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative mx-auto max-w-2xl [text-shadow:0_2px_20px_rgb(0_0_0_/_0.4)]">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              Deja de operar con miedo a una clausura
            </h2>
            <p className="mt-4 text-white/85">
              Crea tu cuenta y obtén el diagnóstico de cumplimiento de tu negocio hoy mismo.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to={primaryHref} className="btn-accent px-6 py-3.5 text-base">
                Empezar gratis <IconArrowRight width={18} height={18} />
              </Link>
              <Link to="/registro" className="btn-glass px-6 py-3.5 text-base text-white">
                Soy profesional / consultor
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/75">
              <span className="inline-flex items-center gap-1.5">
                <IconCheck width={16} height={16} className="text-accent-300" /> Diagnóstico determinístico
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconAlert width={16} height={16} className="text-accent-300" /> Alertas de vencimiento
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconBadgeCheck width={16} height={16} className="text-accent-300" /> Profesionales verificados
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 bg-white">
        <div className="container-app flex flex-col items-center justify-between gap-3 py-8 text-sm text-ink-400 sm:flex-row">
          <Logo compact />
          <p>© {new Date().getFullYear()} CumplIA · Cumplimiento regulatorio · MVP CDMX</p>
          <div className="flex items-center gap-4">
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
