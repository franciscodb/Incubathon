// =====================================================================
// Páginas legales: Aviso de Privacidad y Términos y Condiciones.
// Contenido BASE para el MVP — revísalo con tu asesor legal antes de
// producción. Redactado para el contexto mexicano (LFPDPPP) y el modelo
// de CumplIA.
// =====================================================================
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Logo } from '../components/common'
import { IconArrowRight } from '../components/icons'

const LAST_UPDATED = '11 de julio de 2026'

function LegalShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50">
      <header className="glass sticky top-0 z-40 border-b border-white/50">
        <div className="container-app flex h-16 items-center justify-between">
          <Logo />
          <Link to="/" className="btn-ghost text-sm">
            Volver al inicio <IconArrowRight width={16} height={16} />
          </Link>
        </div>
      </header>

      <main className="container-app max-w-3xl py-10 lg:py-14">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Legal</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-500">{subtitle}</p>
        <p className="mt-1 text-xs text-ink-400">Última actualización: {LAST_UPDATED}</p>

        <div className="legal mt-8 space-y-6 text-sm leading-relaxed text-ink-700">{children}</div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-ink-100 pt-6 text-sm">
          <Link to="/privacidad" className="font-semibold text-brand-600 hover:underline">
            Aviso de Privacidad
          </Link>
          <span className="text-ink-300">·</span>
          <Link to="/terminos" className="font-semibold text-brand-600 hover:underline">
            Términos y Condiciones
          </Link>
        </div>
      </main>
    </div>
  )
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-lg font-bold text-ink-900">{children}</h2>
}

export function Privacy() {
  return (
    <LegalShell
      title="Aviso de Privacidad"
      subtitle="Cómo tratamos tus datos personales en CumplIA."
    >
      <p>
        En cumplimiento de la <strong>Ley Federal de Protección de Datos Personales en Posesión de
        los Particulares (LFPDPPP)</strong>, CumplIA ("la Plataforma")
        pone a tu disposición el presente Aviso de Privacidad.
      </p>

      <section className="space-y-2">
        <H2>1. Responsable</H2>
        <p>
          El responsable del tratamiento de tus datos personales es el operador de la Plataforma.
          Para cualquier asunto relacionado con este aviso puedes escribir a{' '}
          <a className="text-brand-600 hover:underline" href="mailto:privacidad@cumplia.mx">
            privacidad@cumplia.mx
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <H2>2. Datos que recabamos</H2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Datos de identificación y contacto: nombre, correo, teléfono.</li>
          <li>Datos de tus negocios: nombre, RFC, giro, domicilio y características operativas.</li>
          <li>Documentación de trámites que cargues (permisos, dictámenes, avisos).</li>
          <li>Datos de facturación de la suscripción (procesados por nuestro proveedor de pagos).</li>
        </ul>
      </section>

      <section className="space-y-2">
        <H2>3. Finalidades del tratamiento</H2>
        <p>Usamos tus datos para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Generar tu diagnóstico y matriz de cumplimiento regulatorio.</li>
          <li>Administrar tu documentación y alertarte sobre vencimientos.</li>
          <li>Conectarte con profesionales verificados del marketplace.</li>
          <li>Gestionar tu suscripción y facturación.</li>
          <li>Mejorar la Plataforma y cumplir obligaciones legales aplicables.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <H2>4. Pagos y terceros</H2>
        <p>
          Los pagos de suscripción se procesan a través de <strong>Stripe</strong>; no almacenamos
          los datos completos de tu tarjeta. Los pagos por servicios entre negocios y profesionales
          se acuerdan directamente entre las partes y <strong>no pasan por la Plataforma</strong>.
        </p>
      </section>

      <section className="space-y-2">
        <H2>5. Derechos ARCO</H2>
        <p>
          Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición, así como
          revocar tu consentimiento, escribiendo al correo indicado. Atenderemos tu solicitud en los
          plazos que marca la ley.
        </p>
      </section>

      <section className="space-y-2">
        <H2>6. Seguridad y conservación</H2>
        <p>
          Implementamos medidas de seguridad administrativas, técnicas y físicas razonables. Tu
          documentación se resguarda en almacenamiento cifrado y se conserva mientras mantengas tu
          cuenta o según lo exija la normativa.
        </p>
      </section>

      <p className="rounded-xl bg-ink-100 p-4 text-xs text-ink-500">
        Documento base para el MVP. Antes de operar en producción, valida y ajusta este aviso con tu
        asesor legal conforme a la LFPDPPP y su reglamento.
      </p>
    </LegalShell>
  )
}

export function Terms() {
  return (
    <LegalShell
      title="Términos y Condiciones"
      subtitle="Condiciones de uso de CumplIA."
    >
      <section className="space-y-2">
        <H2>1. Objeto del servicio</H2>
        <p>
          La Plataforma es una herramienta <strong>RegTech</strong> que diagnostica obligaciones
          regulatorias, administra documentación, alerta sobre vencimientos y conecta a los negocios
          con profesionales verificados. La información y las guías tienen carácter{' '}
          <strong>orientativo</strong> y no sustituyen la asesoría profesional ni la resolución de
          las autoridades competentes.
        </p>
      </section>

      <section className="space-y-2">
        <H2>2. Cuentas y roles</H2>
        <p>
          Existen cuentas de <strong>dueño de negocio</strong> y de <strong>profesional</strong>.
          Eres responsable de la veracidad de la información que registras y de la confidencialidad
          de tus credenciales.
        </p>
      </section>

      <section className="space-y-2">
        <H2>3. Suscripciones y pagos</H2>
        <ul className="list-disc space-y-1 pl-5">
          <li>El uso de la Plataforma requiere una suscripción por los negocios dados de alta.</li>
          <li>
            El precio se calcula por volumen de negocios más un recargo por cada negocio que vende
            alcohol, según el plan vigente al momento de contratar.
          </li>
          <li>Los cobros de suscripción se procesan a través de Stripe.</li>
          <li>Puedes cancelar tu suscripción; el acceso continúa hasta el fin del período pagado.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <H2>4. Marketplace de profesionales</H2>
        <p>
          La Plataforma <strong>no es parte</strong> de la relación entre negocios y profesionales.
          Los servicios, honorarios y pagos se acuerdan y liquidan <strong>directamente</strong>
          entre las partes. Las evaluaciones solo pueden dejarlas usuarios que cerraron un trabajo
          con el profesional. La verificación de un profesional no constituye una garantía de
          resultados.
        </p>
      </section>

      <section className="space-y-2">
        <H2>5. Clasificación de cumplimiento</H2>
        <p>
          La clasificación (AAA…C) y el semáforo se derivan de la información que registras y tienen
          fines informativos. No constituyen una certificación oficial ni una opinión legal.
        </p>
      </section>

      <section className="space-y-2">
        <H2>6. Uso aceptable y responsabilidad</H2>
        <p>
          Te comprometes a usar la Plataforma conforme a la ley y a no cargar contenido ilícito. En
          la medida permitida por la legislación aplicable, la Plataforma no será responsable por
          decisiones tomadas con base en la información mostrada.
        </p>
      </section>

      <section className="space-y-2">
        <H2>7. Modificaciones y ley aplicable</H2>
        <p>
          Podemos actualizar estos términos; te notificaremos los cambios relevantes. Estos términos
          se rigen por las leyes de los Estados Unidos Mexicanos.
        </p>
      </section>

      <p className="rounded-xl bg-ink-100 p-4 text-xs text-ink-500">
        Documento base para el MVP. Revísalo con tu asesor legal antes de operar en producción.
      </p>
    </LegalShell>
  )
}
